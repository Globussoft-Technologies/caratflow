// ─── Hardware Barcode/QR Service ──────────────────────────────
// Barcode validation, product lookup, barcode/QR generation.
// HID keyboard-wedge scanners are passthrough at the OS level so
// the API only needs to validate + look up scanned codes.

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type {
  BarcodeProductLookup,
  BarcodeGenerateRequest,
  BarcodeGenerateResponse,
  BarcodeBulkGenerateRequest,
  ProductSummary,
} from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

interface ProductLike {
  id: string;
  sku: string;
  name: string;
  productType: string | null;
  sellingPricePaise: bigint | null;
  grossWeightMg: bigint | null;
  netWeightMg: bigint | null;
  metalPurity: number | null;
  huidNumber: string | null;
}

@Injectable()
export class HardwareBarcodeService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  /**
   * Look up a scanned barcode against serial numbers (with embedded
   * `barcodeData`) first, then against product SKU. Always emits a
   * hardware.barcode.scanned event.
   */
  async lookup(tenantId: string, barcode: string): Promise<BarcodeProductLookup> {
    let result: BarcodeProductLookup;

    const serial = await this.prisma.serialNumber.findFirst({
      where: {
        tenantId,
        OR: [{ barcodeData: barcode }, { serialNumber: barcode }],
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            productType: true,
            sellingPricePaise: true,
            grossWeightMg: true,
            netWeightMg: true,
            metalPurity: true,
            huidNumber: true,
          },
        },
      },
    });

    if (serial) {
      result = {
        barcode,
        product: this.toSummary(serial.product as unknown as ProductLike),
        serialNumber: serial.serialNumber,
      };
    } else {
      const product = await this.prisma.product.findFirst({
        where: { tenantId, sku: barcode },
        select: {
          id: true,
          sku: true,
          name: true,
          productType: true,
          sellingPricePaise: true,
          grossWeightMg: true,
          netWeightMg: true,
          metalPurity: true,
          huidNumber: true,
        },
      });

      result = product
        ? {
            barcode,
            product: this.toSummary(product as unknown as ProductLike),
            serialNumber: null,
          }
        : { barcode, product: null, serialNumber: null };
    }

    await this.eventBus.publish({
      id: uuid(),
      type: 'hardware.barcode.scanned',
      tenantId,
      userId: 'system',
      timestamp: new Date().toISOString(),
      payload: { barcode, productId: result.product?.id ?? null },
    });

    return result;
  }

  async generate(
    tenantId: string,
    input: BarcodeGenerateRequest,
  ): Promise<BarcodeGenerateResponse> {
    const product = await this.prisma.product.findFirst({
      where: { tenantId, id: input.productId },
      select: {
        id: true,
        sku: true,
        name: true,
        sellingPricePaise: true,
        grossWeightMg: true,
        metalPurity: true,
        huidNumber: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${input.productId} not found`);
    }

    let barcodeValue: string;
    switch (input.format) {
      case 'SERIAL': {
        const serial = await this.prisma.serialNumber.findFirst({
          where: { tenantId, productId: input.productId },
          orderBy: { createdAt: 'desc' },
        });
        barcodeValue = serial?.barcodeData ?? serial?.serialNumber ?? product.sku;
        break;
      }
      case 'CUSTOM':
        barcodeValue = `${input.customPrefix ?? 'CF'}${product.sku}`;
        break;
      case 'SKU':
      default:
        barcodeValue = product.sku;
    }

    const qrData = JSON.stringify({
      id: product.id,
      sku: product.sku,
      name: product.name,
      weight: product.grossWeightMg ? Number(product.grossWeightMg) : undefined,
      purity: product.metalPurity ?? undefined,
      price: product.sellingPricePaise ? Number(product.sellingPricePaise) : undefined,
      huid: product.huidNumber ?? undefined,
    });

    return {
      productId: product.id,
      barcode: barcodeValue,
      format: input.format,
      qrData,
    };
  }

  async generateBulk(
    tenantId: string,
    input: BarcodeBulkGenerateRequest,
  ): Promise<BarcodeGenerateResponse[]> {
    const results: BarcodeGenerateResponse[] = [];
    for (const productId of input.productIds) {
      try {
        results.push(
          await this.generate(tenantId, {
            productId,
            format: input.format,
            customPrefix: input.customPrefix,
          }),
        );
      } catch {
        results.push({ productId, barcode: '', format: input.format });
      }
    }
    return results;
  }

  private toSummary(p: ProductLike): ProductSummary {
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      productType: p.productType ?? null,
      sellingPricePaise: p.sellingPricePaise !== null ? Number(p.sellingPricePaise) : null,
      grossWeightMg: p.grossWeightMg !== null ? Number(p.grossWeightMg) : null,
      netWeightMg: p.netWeightMg !== null ? Number(p.netWeightMg) : null,
      purityFineness: p.metalPurity ?? null,
      huid: p.huidNumber ?? null,
    };
  }
}
