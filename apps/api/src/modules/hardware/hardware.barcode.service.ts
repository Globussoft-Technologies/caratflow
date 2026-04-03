// ─── Hardware Barcode/QR Service ──────────────────────────────
// Barcode scan processing, product lookup, barcode/QR generation.

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  BarcodeProductLookup,
  BarcodeGenerateRequest,
  BarcodeGenerateResponse,
  BarcodeBulkGenerateRequest,
  ProductSummary,
} from '@caratflow/shared-types';

@Injectable()
export class HardwareBarcodeService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Process a barcode scan: look up product by SKU barcode or serial number barcode.
   */
  async lookup(tenantId: string, barcode: string): Promise<BarcodeProductLookup> {
    // First try to match by serial number barcode
    const serial = await this.prisma.serialNumber.findFirst({
      where: {
        tenantId,
        OR: [
          { barcodeData: barcode },
          { serialNumber: barcode },
        ],
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
            purityFineness: true,
            huid: true,
          },
        },
      },
    });

    if (serial) {
      return {
        barcode,
        product: this.mapProductSummary(serial.product),
        serialNumber: serial.serialNumber,
      };
    }

    // Then try to match by product SKU
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId,
        OR: [
          { sku: barcode },
          { barcode: barcode },
        ],
      },
      select: {
        id: true,
        sku: true,
        name: true,
        productType: true,
        sellingPricePaise: true,
        grossWeightMg: true,
        netWeightMg: true,
        purityFineness: true,
        huid: true,
      },
    });

    if (product) {
      return {
        barcode,
        product: this.mapProductSummary(product),
        serialNumber: null,
      };
    }

    return {
      barcode,
      product: null,
      serialNumber: null,
    };
  }

  /**
   * Generate barcode data for a product (SKU-based, serial-based, or custom format).
   */
  async generate(tenantId: string, input: BarcodeGenerateRequest): Promise<BarcodeGenerateResponse> {
    const product = await this.prisma.product.findFirst({
      where: this.tenantWhere(tenantId, { id: input.productId }),
      select: {
        id: true,
        sku: true,
        name: true,
        sellingPricePaise: true,
        grossWeightMg: true,
        netWeightMg: true,
        purityFineness: true,
        huid: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${input.productId} not found`);
    }

    let barcodeValue: string;

    switch (input.format) {
      case 'SERIAL': {
        // Find the latest serial number for this product
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
        break;
    }

    // Build QR data with product details for quick lookup
    const qrData = JSON.stringify({
      id: product.id,
      sku: product.sku,
      name: product.name,
      weight: product.grossWeightMg ? Number(product.grossWeightMg) : undefined,
      purity: product.purityFineness ?? undefined,
      price: product.sellingPricePaise ? Number(product.sellingPricePaise) : undefined,
      huid: product.huid ?? undefined,
    });

    return {
      productId: product.id,
      barcode: barcodeValue,
      format: input.format,
      qrData,
    };
  }

  /**
   * Batch barcode generation for multiple products.
   */
  async generateBulk(
    tenantId: string,
    input: BarcodeBulkGenerateRequest,
  ): Promise<BarcodeGenerateResponse[]> {
    const results: BarcodeGenerateResponse[] = [];

    for (const productId of input.productIds) {
      try {
        const result = await this.generate(tenantId, {
          productId,
          format: input.format,
          customPrefix: input.customPrefix,
        });
        results.push(result);
      } catch {
        // Skip products that can't be found
        results.push({
          productId,
          barcode: '',
          format: input.format,
        });
      }
    }

    return results;
  }

  private mapProductSummary(product: Record<string, unknown>): ProductSummary {
    return {
      id: product.id as string,
      sku: product.sku as string,
      name: product.name as string,
      productType: (product.productType as string) ?? null,
      sellingPricePaise: product.sellingPricePaise ? Number(product.sellingPricePaise) : null,
      grossWeightMg: product.grossWeightMg ? Number(product.grossWeightMg) : null,
      netWeightMg: product.netWeightMg ? Number(product.netWeightMg) : null,
      purityFineness: (product.purityFineness as number) ?? null,
      huid: (product.huid as string) ?? null,
    };
  }
}
