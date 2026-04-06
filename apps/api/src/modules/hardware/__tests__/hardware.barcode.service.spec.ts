import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { HardwareBarcodeService } from '../hardware.barcode.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    serialNumber: { findFirst: vi.fn() },
    product: { ...base.product, findFirst: vi.fn() },
  };
}

describe('HardwareBarcodeService (Unit)', () => {
  let service: HardwareBarcodeService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new HardwareBarcodeService(mockPrisma as any);
  });

  describe('lookup', () => {
    it('finds product by serial number barcode', async () => {
      mockPrisma.serialNumber.findFirst.mockResolvedValue({
        serialNumber: 'SN-001',
        product: { id: 'p-1', sku: 'GR-001', name: 'Ring', productType: 'FINISHED_GOODS' },
      });

      const result = await service.lookup(TEST_TENANT_ID, 'SN-001');
      expect(result.product).toBeDefined();
      expect(result.product!.sku).toBe('GR-001');
      expect(result.serialNumber).toBe('SN-001');
    });

    it('finds product by SKU when serial not found', async () => {
      mockPrisma.serialNumber.findFirst.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'p-1', sku: 'GR-001', name: 'Ring', productType: 'FINISHED_GOODS',
      });

      const result = await service.lookup(TEST_TENANT_ID, 'GR-001');
      expect(result.product).toBeDefined();
      expect(result.serialNumber).toBeNull();
    });

    it('returns null product when nothing matches', async () => {
      mockPrisma.serialNumber.findFirst.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const result = await service.lookup(TEST_TENANT_ID, 'UNKNOWN');
      expect(result.product).toBeNull();
    });
  });

  describe('generate', () => {
    it('generates SKU-based barcode', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'p-1', sku: 'GR-001', name: 'Ring',
      });

      const result = await service.generate(TEST_TENANT_ID, {
        productId: 'p-1', format: 'SKU',
      } as any);

      expect(result.barcode).toBe('GR-001');
      expect(result.qrData).toContain('GR-001');
    });

    it('generates custom-prefix barcode', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'p-1', sku: 'GR-001', name: 'Ring',
      });

      const result = await service.generate(TEST_TENANT_ID, {
        productId: 'p-1', format: 'CUSTOM', customPrefix: 'JW',
      } as any);

      expect(result.barcode).toBe('JWGR-001');
    });

    it('throws NotFoundException for missing product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.generate(TEST_TENANT_ID, { productId: 'bad', format: 'SKU' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('includes QR data with product details', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'p-1', sku: 'GR-001', name: 'Ring',
        grossWeightMg: 5000n, purityFineness: 916, sellingPricePaise: 500000n, huid: 'HUID-1',
      });

      const result = await service.generate(TEST_TENANT_ID, { productId: 'p-1', format: 'SKU' } as any);
      const qr = JSON.parse(result.qrData!);
      expect(qr.sku).toBe('GR-001');
      expect(qr.huid).toBe('HUID-1');
    });
  });

  describe('generateBulk', () => {
    it('generates barcodes for multiple products', async () => {
      mockPrisma.product.findFirst
        .mockResolvedValueOnce({ id: 'p-1', sku: 'SK-1', name: 'A' })
        .mockResolvedValueOnce(null); // second fails

      const result = await service.generateBulk(TEST_TENANT_ID, {
        productIds: ['p-1', 'p-bad'], format: 'SKU',
      } as any);

      expect(result).toHaveLength(2);
      expect(result[0].barcode).toBe('SK-1');
      expect(result[1].barcode).toBe(''); // fallback for not found
    });
  });
});
