// ─── Hardware RFID Service ─────────────────────────────────────
// RFID tag processing, stock take, anti-theft, and tag encoding.

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  RfidTagData,
  RfidScanResult,
  RfidTagLookupResponse,
  RfidStockTakeInput,
  RfidStockTakeResult,
  RfidAntiTheftCheck,
  RfidAntiTheftResult,
  RfidWriteRequest,
} from '@caratflow/shared-types';

@Injectable()
export class HardwareRfidService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Process an RFID scan event: look up tag in SerialNumber table, return product info.
   */
  async processScans(tenantId: string, input: RfidScanResult): Promise<RfidTagLookupResponse[]> {
    const results: RfidTagLookupResponse[] = [];

    for (const tag of input.tags) {
      const result = await this.lookupTag(tenantId, tag.epc);
      results.push(result);
    }

    return results;
  }

  /**
   * Look up a single RFID tag by EPC code.
   */
  async lookupTag(tenantId: string, epc: string): Promise<RfidTagLookupResponse> {
    const serial = await this.prisma.serialNumber.findFirst({
      where: {
        tenantId,
        rfidTag: epc,
      },
      include: {
        product: {
          select: { id: true, sku: true, name: true },
        },
        location: {
          select: { id: true, name: true },
        },
      },
    });

    if (!serial) {
      return {
        tagId: epc,
        epc,
        serialNumber: null,
        productId: null,
        productName: null,
        productSku: null,
        locationId: null,
        status: null,
      };
    }

    return {
      tagId: epc,
      epc,
      serialNumber: serial.serialNumber,
      productId: serial.product.id,
      productName: serial.product.name,
      productSku: serial.product.sku,
      locationId: serial.location?.id ?? null,
      status: serial.status,
    };
  }

  /**
   * RFID-based stock take: scan all tags at a location, compare with system stock.
   * Returns matched, unmatched (scanned but not in system), and missing (in system but not scanned).
   */
  async stockTake(tenantId: string, input: RfidStockTakeInput): Promise<RfidStockTakeResult> {
    const { locationId, scannedTags } = input;

    // Get all serial numbers with RFID tags at the given location
    const expectedSerials = await this.prisma.serialNumber.findMany({
      where: {
        tenantId,
        locationId,
        rfidTag: { not: null },
        status: { in: ['AVAILABLE', 'RESERVED'] },
      },
      include: {
        product: {
          select: { id: true, sku: true, name: true },
        },
      },
    });

    // Build lookup maps
    const scannedEpcs = new Set(scannedTags.map((t) => t.epc));
    const expectedByRfid = new Map(
      expectedSerials.map((s) => [s.rfidTag!, s]),
    );

    const matched: RfidStockTakeResult['matched'] = [];
    const unmatched: RfidStockTakeResult['unmatched'] = [];
    const missing: RfidStockTakeResult['missing'] = [];

    // Process scanned tags
    for (const tag of scannedTags) {
      const serial = expectedByRfid.get(tag.epc);
      if (serial) {
        matched.push({
          tagId: tag.tagId,
          epc: tag.epc,
          serialNumber: serial.serialNumber,
          productId: serial.product.id,
          productName: serial.product.name,
          productSku: serial.product.sku,
        });
      } else {
        unmatched.push({
          tagId: tag.tagId,
          epc: tag.epc,
        });
      }
    }

    // Find missing items (expected but not scanned)
    for (const serial of expectedSerials) {
      if (!scannedEpcs.has(serial.rfidTag!)) {
        missing.push({
          serialNumber: serial.serialNumber,
          productId: serial.product.id,
          productName: serial.product.name,
          productSku: serial.product.sku,
          rfidTag: serial.rfidTag!,
        });
      }
    }

    return {
      locationId,
      totalScanned: scannedTags.length,
      matched,
      unmatched,
      missing,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Write/encode RFID tag data. Associates an RFID tag with a serial number.
   */
  async writeTag(tenantId: string, userId: string, serialNumberId: string, input: RfidWriteRequest): Promise<void> {
    const serial = await this.prisma.serialNumber.findFirst({
      where: this.tenantWhere(tenantId, { id: serialNumberId }),
    });

    if (!serial) {
      throw new NotFoundException(`Serial number ${serialNumberId} not found`);
    }

    // Check if the RFID tag is already assigned to another serial
    const existingTag = await this.prisma.serialNumber.findFirst({
      where: {
        tenantId,
        rfidTag: input.data,
        id: { not: serialNumberId },
      },
    });

    if (existingTag) {
      throw new NotFoundException(
        `RFID tag ${input.data} is already assigned to serial number ${existingTag.serialNumber}`,
      );
    }

    await this.prisma.serialNumber.update({
      where: { id: serialNumberId },
      data: {
        rfidTag: input.data,
        updatedBy: userId,
      },
    });
  }

  /**
   * Anti-theft check: validate an RFID tag at an exit point.
   * Returns whether the tag is authorized to leave (e.g., status is SOLD).
   */
  async antiTheftCheck(tenantId: string, input: RfidAntiTheftCheck): Promise<RfidAntiTheftResult> {
    const serial = await this.prisma.serialNumber.findFirst({
      where: {
        tenantId,
        rfidTag: input.epc,
      },
      include: {
        product: { select: { name: true } },
      },
    });

    if (!serial) {
      return {
        tagId: input.tagId,
        isAuthorized: false,
        serialNumber: null,
        productName: null,
        reason: 'Unknown RFID tag - not registered in system',
      };
    }

    // Item is authorized to leave if it has been sold
    if (serial.status === 'SOLD') {
      return {
        tagId: input.tagId,
        isAuthorized: true,
        serialNumber: serial.serialNumber,
        productName: serial.product.name,
        reason: 'Item has been sold',
      };
    }

    // Item is authorized if it is in transit (being transferred)
    if (serial.status === 'IN_TRANSIT') {
      return {
        tagId: input.tagId,
        isAuthorized: true,
        serialNumber: serial.serialNumber,
        productName: serial.product.name,
        reason: 'Item is in authorized transit',
      };
    }

    // Otherwise, flag as unauthorized
    return {
      tagId: input.tagId,
      isAuthorized: false,
      serialNumber: serial.serialNumber,
      productName: serial.product.name,
      reason: `Item status is ${serial.status} - not authorized to leave premises`,
    };
  }
}
