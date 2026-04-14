import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { HardwareBarcodeService } from '../hardware.barcode.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    serialNumber: {
      findFirst: vi.fn(),
    },
    product: { ...base.product, findFirst: vi.fn() },
  };
}

function mockEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
  };
}

describe('HardwareBarcodeService (Unit)', () => {
  let service: HardwareBarcodeService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  let eventBus: ReturnType<typeof mockEventBus>;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    eventBus = mockEventBus();
    service = new HardwareBarcodeService(mockPrisma as any, eventBus as any);
  });

  describe('lookup', () => {
    it('finds product by serial-number barcode and emits scanned event', async () => {
      mockPrisma.serialNumber.findFirst.mockResolvedValue({
        serialNumber: 'SN-001',
        product: {
          id: 'p-1',
          sku: 'GR-001',
          name: 'Ring',
          productType: 'FINISHED_GOODS',
          sellingPricePaise: 500000n,
          grossWeightMg: 5000n,
          netWeightMg: 4500n,
          metalPurity: 916,
          huidNumber: 'HUID-1',
        },
      });

      const result = await service.lookup(TEST_TENANT_ID, 'SN-001');

      expect(result.product).toBeDefined();
      expect(result.product!.sku).toBe('GR-001');
      expect(result.serialNumber).toBe('SN-001');
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hardware.barcode.scanned',
          payload: expect.objectContaining({ barcode: 'SN-001', productId: 'p-1' }),
        }),
      );
    });

    it('falls back to product SKU when serial not found', async () => {
      mockPrisma.serialNumber.findFirst.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'p-2',
        sku: 'GR-002',
        name: 'Ring',
        productType: 'FINISHED_GOODS',
        sellingPricePaise: 100n,
        grossWeightMg: null,
        netWeightMg: null,
        metalPurity: null,
        huidNumber: null,
      });

      const result = await service.lookup(TEST_TENANT_ID, 'GR-002');

      expect(result.product!.sku).toBe('GR-002');
      expect(result.serialNumber).toBeNull();
    });

    it('returns {product: null, serialNumber: null} on miss and still emits event', async () => {
      mockPrisma.serialNumber.findFirst.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const result = await service.lookup(TEST_TENANT_ID, 'UNKNOWN');

      expect(result.product).toBeNull();
      expect(result.serialNumber).toBeNull();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hardware.barcode.scanned',
          payload: expect.objectContaining({ barcode: 'UNKNOWN', productId: null }),
        }),
      );
    });
  });

  describe('generate', () => {
    it('generates SKU-based barcode with JSON QR payload', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'p-1',
        sku: 'GR-001',
        name: 'Ring',
        sellingPricePaise: 500000n,
        grossWeightMg: 5000n,
        metalPurity: 916,
        huidNumber: 'HUID-1',
      });

      const result = await service.generate(TEST_TENANT_ID, {
        productId: 'p-1',
        format: 'SKU',
      } as any);

      expect(result.barcode).toBe('GR-001');
      const qr = JSON.parse(result.qrData!);
      expect(qr.sku).toBe('GR-001');
      expect(qr.huid).toBe('HUID-1');
      expect(qr.weight).toBe(5000);
      expect(qr.purity).toBe(916);
    });

    it('generates custom-prefix barcode', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'p-1',
        sku: 'GR-001',
        name: 'Ring',
        sellingPricePaise: null,
        grossWeightMg: null,
        metalPurity: null,
        huidNumber: null,
      });

      const result = await service.generate(TEST_TENANT_ID, {
        productId: 'p-1',
        format: 'CUSTOM',
        customPrefix: 'JW',
      } as any);

      expect(result.barcode).toBe('JWGR-001');
    });

    it('throws NotFoundException when product is missing', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.generate(TEST_TENANT_ID, { productId: 'bad', format: 'SKU' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateBulk', () => {
    it('generates barcodes for multiple products and falls back on failure', async () => {
      mockPrisma.product.findFirst
        .mockResolvedValueOnce({
          id: 'p-1',
          sku: 'SK-1',
          name: 'A',
          sellingPricePaise: null,
          grossWeightMg: null,
          metalPurity: null,
          huidNumber: null,
        })
        .mockResolvedValueOnce(null); // second fails

      const result = await service.generateBulk(TEST_TENANT_ID, {
        productIds: ['p-1', 'p-bad'],
        format: 'SKU',
      } as any);

      expect(result).toHaveLength(2);
      expect(result[0]!.barcode).toBe('SK-1');
      expect(result[1]!.barcode).toBe(''); // fallback
    });
  });
});
