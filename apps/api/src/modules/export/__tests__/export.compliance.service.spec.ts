import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportComplianceService } from '../export.compliance.service';
import { createMockPrismaService, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ExportComplianceService (Unit)', () => {
  let service: ExportComplianceService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    (mockPrisma as any).exportCompliance = {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    };
    (mockPrisma as any).exportOrder = {
      findFirst: vi.fn(),
    };
    (mockPrisma as any).exportInvoice = {
      findFirst: vi.fn(),
    };
    service = new ExportComplianceService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── checkCompliance ────────────────────────────────────────────

  describe('checkCompliance', () => {
    it('returns compliance requirements for known destination/category', async () => {
      (mockPrisma as any).exportCompliance.findUnique.mockResolvedValue({
        destinationCountry: 'US',
        productCategory: '71',
        requiresHallmark: true,
        requiresCertificate: true,
        restrictedItems: [{ item: 'Ivory', reason: 'CITES' }],
        dutyExemptions: [],
        notes: 'Hallmark required for gold above 10K',
      });

      const results = await service.checkCompliance({
        destinationCountry: 'US',
        productCategories: ['71'],
      });

      expect(results).toHaveLength(1);
      expect(results[0].requiresHallmark).toBe(true);
      expect(results[0].requiresCertificate).toBe(true);
      expect(results[0].restrictedItems).toHaveLength(1);
    });

    it('returns default (no restrictions) for unknown destination/category', async () => {
      (mockPrisma as any).exportCompliance.findUnique.mockResolvedValue(null);

      const results = await service.checkCompliance({
        destinationCountry: 'XX',
        productCategories: ['99'],
      });

      expect(results).toHaveLength(1);
      expect(results[0].requiresHallmark).toBe(false);
      expect(results[0].requiresCertificate).toBe(false);
      expect(results[0].notes).toContain('No specific compliance rules');
    });

    it('checks multiple categories', async () => {
      (mockPrisma as any).exportCompliance.findUnique
        .mockResolvedValueOnce({
          destinationCountry: 'AE',
          productCategory: '71',
          requiresHallmark: true,
          requiresCertificate: false,
          restrictedItems: [],
          dutyExemptions: [],
          notes: null,
        })
        .mockResolvedValueOnce(null);

      const results = await service.checkCompliance({
        destinationCountry: 'AE',
        productCategories: ['71', '85'],
      });

      expect(results).toHaveLength(2);
      expect(results[0].requiresHallmark).toBe(true);
      expect(results[1].requiresHallmark).toBe(false);
    });
  });

  // ─── listComplianceRules ────────────────────────────────────────

  describe('listComplianceRules', () => {
    it('lists all compliance rules', async () => {
      (mockPrisma as any).exportCompliance.findMany.mockResolvedValue([
        { destinationCountry: 'US', productCategory: '71', requiresHallmark: true, requiresCertificate: true, restrictedItems: [], dutyExemptions: [], notes: null },
        { destinationCountry: 'UK', productCategory: '71', requiresHallmark: true, requiresCertificate: false, restrictedItems: [], dutyExemptions: [], notes: null },
      ]);

      const results = await service.listComplianceRules({});
      expect(results).toHaveLength(2);
    });

    it('filters by destination country', async () => {
      (mockPrisma as any).exportCompliance.findMany.mockResolvedValue([
        { destinationCountry: 'US', productCategory: '71', requiresHallmark: true, requiresCertificate: true, restrictedItems: [], dutyExemptions: [], notes: null },
      ]);

      const results = await service.listComplianceRules({ destinationCountry: 'US' });
      expect(results).toHaveLength(1);
      expect(results[0].destinationCountry).toBe('US');
    });
  });

  // ─── checkExportReadiness ───────────────────────────────────────

  describe('checkExportReadiness', () => {
    it('returns isReady=true when all requirements are met', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        buyerCountry: 'US',
        items: [{ hsCode: '7113.19' }],
        shippingDocuments: [
          { documentType: 'PACKING_LIST' },
          { documentType: 'SHIPPING_BILL' },
        ],
      });
      (mockPrisma as any).exportInvoice.findFirst.mockResolvedValue({ id: 'inv-1' });
      (mockPrisma as any).exportCompliance.findUnique.mockResolvedValue(null);

      const result = await service.checkExportReadiness(TEST_TENANT_ID, 'order-1');

      expect(result.isReady).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('identifies missing commercial invoice', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        buyerCountry: 'US',
        items: [],
        shippingDocuments: [
          { documentType: 'PACKING_LIST' },
          { documentType: 'SHIPPING_BILL' },
        ],
      });
      (mockPrisma as any).exportInvoice.findFirst.mockResolvedValue(null);

      const result = await service.checkExportReadiness(TEST_TENANT_ID, 'order-1');

      expect(result.isReady).toBe(false);
      expect(result.missing).toContain('Commercial invoice required');
    });

    it('identifies missing packing list and shipping bill', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        buyerCountry: 'US',
        items: [],
        shippingDocuments: [],
      });
      (mockPrisma as any).exportInvoice.findFirst.mockResolvedValue({ id: 'inv-1' });

      const result = await service.checkExportReadiness(TEST_TENANT_ID, 'order-1');

      expect(result.isReady).toBe(false);
      expect(result.missing).toContain('Packing list required');
      expect(result.missing).toContain('Shipping bill required');
    });

    it('returns not ready when order not found', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue(null);

      const result = await service.checkExportReadiness(TEST_TENANT_ID, 'nonexistent');

      expect(result.isReady).toBe(false);
      expect(result.missing).toContain('Export order not found');
    });

    it('adds warning when hallmark is required for destination', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        buyerCountry: 'UK',
        items: [{ hsCode: '7113.19' }],
        shippingDocuments: [
          { documentType: 'PACKING_LIST' },
          { documentType: 'SHIPPING_BILL' },
        ],
      });
      (mockPrisma as any).exportInvoice.findFirst.mockResolvedValue({ id: 'inv-1' });
      (mockPrisma as any).exportCompliance.findUnique.mockResolvedValue({
        requiresCertificate: false,
        requiresHallmark: true,
      });

      const result = await service.checkExportReadiness(TEST_TENANT_ID, 'order-1');

      expect(result.warnings.some((w: string) => w.includes('Hallmark'))).toBe(true);
    });

    it('identifies missing certificate of origin when required', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        buyerCountry: 'AE',
        items: [{ hsCode: '7113.19' }],
        shippingDocuments: [
          { documentType: 'PACKING_LIST' },
          { documentType: 'SHIPPING_BILL' },
        ],
      });
      (mockPrisma as any).exportInvoice.findFirst.mockResolvedValue({ id: 'inv-1' });
      (mockPrisma as any).exportCompliance.findUnique.mockResolvedValue({
        requiresCertificate: true,
        requiresHallmark: false,
      });

      const result = await service.checkExportReadiness(TEST_TENANT_ID, 'order-1');

      expect(result.isReady).toBe(false);
      expect(result.missing.some((m: string) => m.includes('Certificate of Origin'))).toBe(true);
    });
  });
});
