import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceTraceabilityService } from '../compliance.traceability.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ComplianceTraceabilityService (Unit)', () => {
  let service: ComplianceTraceabilityService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    (mockPrisma as any).chainOfCustody = {
      findMany: vi.fn(),
      create: vi.fn(),
    };
    (mockPrisma as any).huidRecord = {
      findFirst: vi.fn(),
    };
    (mockPrisma as any).gemstoneCertificate = {
      findMany: vi.fn(),
    };
    (mockPrisma as any).product = {
      ...mockPrisma.product,
      findMany: vi.fn(),
    };
    service = new ComplianceTraceabilityService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── recordEvent ────────────────────────────────────────────────

  describe('recordEvent', () => {
    it('records a SOURCED custody event', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
      (mockPrisma as any).chainOfCustody.create.mockResolvedValue({
        id: 'coc-1',
        productId: 'prod-1',
        eventType: 'SOURCED',
        fromEntityType: 'SUPPLIER',
        fromEntityId: 'sup-1',
      });

      const result = await service.recordEvent(TEST_TENANT_ID, TEST_USER_ID, {
        productId: 'prod-1',
        eventType: 'SOURCED',
        fromEntityType: 'SUPPLIER',
        fromEntityId: 'sup-1',
      } as any);

      expect(result.eventType).toBe('SOURCED');
    });

    it('records an IMPORTED event', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
      (mockPrisma as any).chainOfCustody.create.mockResolvedValue({
        id: 'coc-2',
        eventType: 'IMPORTED',
        documentReference: 'IMP-2025-001',
      });

      const result = await service.recordEvent(TEST_TENANT_ID, TEST_USER_ID, {
        productId: 'prod-1',
        eventType: 'IMPORTED',
        documentReference: 'IMP-2025-001',
      } as any);

      expect(result.eventType).toBe('IMPORTED');
    });

    it('records a MANUFACTURED event', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
      (mockPrisma as any).chainOfCustody.create.mockResolvedValue({
        id: 'coc-3',
        eventType: 'MANUFACTURED',
        locationId: 'loc-1',
      });

      const result = await service.recordEvent(TEST_TENANT_ID, TEST_USER_ID, {
        productId: 'prod-1',
        eventType: 'MANUFACTURED',
        locationId: 'loc-1',
      } as any);

      expect(result.eventType).toBe('MANUFACTURED');
    });

    it('records a SOLD event', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1' });
      (mockPrisma as any).chainOfCustody.create.mockResolvedValue({
        id: 'coc-4',
        eventType: 'SOLD',
        toEntityType: 'CUSTOMER',
        toEntityId: 'cust-1',
      });

      const result = await service.recordEvent(TEST_TENANT_ID, TEST_USER_ID, {
        productId: 'prod-1',
        eventType: 'SOLD',
        toEntityType: 'CUSTOMER',
        toEntityId: 'cust-1',
      } as any);

      expect(result.eventType).toBe('SOLD');
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.recordEvent(TEST_TENANT_ID, TEST_USER_ID, {
          productId: 'nonexistent',
          eventType: 'SOURCED',
        } as any),
      ).rejects.toThrow('Product not found');
    });
  });

  // ─── getChainForProduct ─────────────────────────────────────────

  describe('getChainForProduct', () => {
    it('returns full chain in chronological order', async () => {
      const events = [
        { id: 'coc-1', eventType: 'SOURCED', eventDate: new Date('2025-01-01') },
        { id: 'coc-2', eventType: 'MANUFACTURED', eventDate: new Date('2025-02-01') },
        { id: 'coc-3', eventType: 'SOLD', eventDate: new Date('2025-03-01') },
      ];

      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', sku: 'GR-001', name: 'Gold Ring' });
      (mockPrisma as any).chainOfCustody.findMany.mockResolvedValue(events);
      (mockPrisma as any).huidRecord.findFirst.mockResolvedValue({
        id: 'h1',
        huidNumber: 'ABC123',
        weightMg: 5000n,
      });
      (mockPrisma as any).gemstoneCertificate.findMany.mockResolvedValue([]);

      const result = await service.getChainForProduct(TEST_TENANT_ID, 'prod-1');

      expect(result.events).toHaveLength(3);
      expect(result.events[0].eventType).toBe('SOURCED');
      expect(result.events[2].eventType).toBe('SOLD');
      expect(result.huidRecord).toBeDefined();
      expect(result.huidRecord!.weightMg).toBe(5000); // BigInt converted to Number
    });

    it('returns null huidRecord when none exists', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', sku: 'S1', name: 'P1' });
      (mockPrisma as any).chainOfCustody.findMany.mockResolvedValue([]);
      (mockPrisma as any).huidRecord.findFirst.mockResolvedValue(null);
      (mockPrisma as any).gemstoneCertificate.findMany.mockResolvedValue([]);

      const result = await service.getChainForProduct(TEST_TENANT_ID, 'prod-1');
      expect(result.huidRecord).toBeNull();
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.getChainForProduct(TEST_TENANT_ID, 'nonexistent'),
      ).rejects.toThrow('Product not found');
    });

    it('includes certificates in chain data', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'prod-1', sku: 'S1', name: 'P1' });
      (mockPrisma as any).chainOfCustody.findMany.mockResolvedValue([]);
      (mockPrisma as any).huidRecord.findFirst.mockResolvedValue(null);
      (mockPrisma as any).gemstoneCertificate.findMany.mockResolvedValue([
        { id: 'cert-1', certificateNumber: 'GIA-001' },
      ]);

      const result = await service.getChainForProduct(TEST_TENANT_ID, 'prod-1');
      expect(result.certificates).toHaveLength(1);
    });
  });

  // ─── searchByProduct ────────────────────────────────────────────

  describe('searchByProduct', () => {
    it('searches products by sku, name, or huidNumber', async () => {
      (mockPrisma as any).product.findMany.mockResolvedValue([
        { id: 'p1', sku: 'GR-001', name: 'Gold Ring', huidNumber: 'ABC123' },
      ]);

      const results = await service.searchByProduct(TEST_TENANT_ID, 'Gold');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Gold Ring');
    });
  });
});
