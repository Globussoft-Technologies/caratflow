import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportDocumentService } from '../export.document.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ExportDocumentService (Unit)', () => {
  let service: ExportDocumentService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    (mockPrisma as any).exportOrder = {
      findFirst: vi.fn(),
    };
    (mockPrisma as any).shippingDocument = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };
    (mockPrisma as any).exportInvoice = {
      findFirst: vi.fn(),
    };
    service = new ExportDocumentService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
  });

  // ─── createDocument ─────────────────────────────────────────────

  describe('createDocument', () => {
    it('creates a shipping document in DRAFT status', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({ id: 'order-1' });
      (mockPrisma as any).shippingDocument.create.mockResolvedValue({});
      (mockPrisma as any).shippingDocument.findFirst.mockResolvedValue({
        id: 'doc-1',
        tenantId: TEST_TENANT_ID,
        exportOrderId: 'order-1',
        documentType: 'PACKING_LIST',
        status: 'DRAFT',
        documentNumber: null,
        issuedDate: null,
        expiryDate: null,
        fileUrl: null,
        notes: null,
        exportOrder: { orderNumber: 'EXP/001' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createDocument(TEST_TENANT_ID, TEST_USER_ID, {
        exportOrderId: 'order-1',
        documentType: 'PACKING_LIST',
      } as any);

      expect(result.status).toBe('DRAFT');
      expect(result.documentType).toBe('PACKING_LIST');
    });

    it('throws NotFoundException when export order not found', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.createDocument(TEST_TENANT_ID, TEST_USER_ID, {
          exportOrderId: 'nonexistent',
          documentType: 'PACKING_LIST',
        } as any),
      ).rejects.toThrow('not found');
    });
  });

  // ─── updateDocumentStatus ───────────────────────────────────────

  describe('updateDocumentStatus', () => {
    it('updates status to ISSUED and sets issuedDate', async () => {
      (mockPrisma as any).shippingDocument.findFirst
        .mockResolvedValueOnce({ id: 'doc-1', documentType: 'PACKING_LIST', exportOrderId: 'order-1', issuedDate: null })
        .mockResolvedValueOnce({
          id: 'doc-1',
          tenantId: TEST_TENANT_ID,
          exportOrderId: 'order-1',
          documentType: 'PACKING_LIST',
          status: 'ISSUED',
          issuedDate: new Date(),
          expiryDate: null,
          fileUrl: null,
          documentNumber: null,
          notes: null,
          exportOrder: { orderNumber: 'EXP/001' },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      (mockPrisma as any).shippingDocument.update.mockResolvedValue({});

      const result = await service.updateDocumentStatus(TEST_TENANT_ID, TEST_USER_ID, 'doc-1', 'ISSUED' as any);

      expect(result.status).toBe('ISSUED');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'export.document.issued' }),
      );
    });

    it('does not overwrite existing issuedDate', async () => {
      const existingDate = new Date('2025-01-15');
      (mockPrisma as any).shippingDocument.findFirst
        .mockResolvedValueOnce({ id: 'doc-1', documentType: 'PACKING_LIST', exportOrderId: 'order-1', issuedDate: existingDate })
        .mockResolvedValueOnce({
          id: 'doc-1',
          tenantId: TEST_TENANT_ID,
          exportOrderId: 'order-1',
          documentType: 'PACKING_LIST',
          status: 'ISSUED',
          issuedDate: existingDate,
          expiryDate: null,
          fileUrl: null,
          documentNumber: null,
          notes: null,
          exportOrder: { orderNumber: 'EXP/001' },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      (mockPrisma as any).shippingDocument.update.mockResolvedValue({});

      await service.updateDocumentStatus(TEST_TENANT_ID, TEST_USER_ID, 'doc-1', 'ISSUED' as any);

      // issuedDate should be undefined (not overwritten) since doc already has one
      expect((mockPrisma as any).shippingDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ issuedDate: undefined }),
        }),
      );
    });

    it('throws NotFoundException for missing document', async () => {
      (mockPrisma as any).shippingDocument.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDocumentStatus(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent', 'ISSUED' as any),
      ).rejects.toThrow('not found');
    });
  });

  // ─── generatePackingList ────────────────────────────────────────

  describe('generatePackingList', () => {
    it('generates packing list from order items', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'EXP/001',
        items: [
          { description: 'Gold Ring', quantity: 5, weightMg: 25000n, hsCode: '7113.19' },
          { description: 'Gold Chain', quantity: 3, weightMg: 45000n, hsCode: '7113.19' },
        ],
        buyer: { firstName: 'John', lastName: 'Doe', address: '123 Main St', city: 'NYC', country: 'US' },
      });

      const result = await service.generatePackingList(TEST_TENANT_ID, 'order-1');

      expect(result.items).toHaveLength(2);
      expect(result.totalPackages).toBe(2);
      expect(result.totalGrossWeightMg).toBe(70000);
      expect(result.buyerName).toBe('John Doe');
      expect(result.buyerAddress).toContain('NYC');
    });

    it('calculates net weight as ~95% of gross weight', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'EXP/001',
        items: [
          { description: 'Gold Ring', quantity: 1, weightMg: 100000n, hsCode: '7113.19' },
        ],
        buyer: { firstName: 'Jane', lastName: 'Smith', address: '456 Elm', city: 'London', country: 'UK' },
      });

      const result = await service.generatePackingList(TEST_TENANT_ID, 'order-1');

      expect(result.items[0].grossWeightMg).toBe(100000);
      expect(result.items[0].netWeightMg).toBe(95000); // 95% of 100000
    });

    it('throws NotFoundException for missing order', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.generatePackingList(TEST_TENANT_ID, 'nonexistent'),
      ).rejects.toThrow('not found');
    });
  });

  // ─── generateShippingBillData ───────────────────────────────────

  describe('generateShippingBillData', () => {
    it('generates shipping bill data from invoice', async () => {
      (mockPrisma as any).exportInvoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'EI/001',
        ieCode: 'IE-001',
        adCode: 'AD-001',
        currencyCode: 'USD',
        exchangeRate: 830000,
        portOfLoading: 'INMAA',
        portOfDischarge: 'USLAX',
        createdAt: new Date(),
        items: [
          { description: 'Gold Ring', hsCode: '7113.19', quantity: 5, totalPricePaise: 25000000n, weightMg: 25000n, countryOfOrigin: 'IN' },
        ],
        buyer: { firstName: 'John', lastName: 'Doe', country: 'US' },
        exportOrder: { buyerCountry: 'US' },
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ name: 'Test Jewelers' });

      const result = await service.generateShippingBillData(TEST_TENANT_ID, 'inv-1');

      expect(result.exporterName).toBe('Test Jewelers');
      expect(result.ieCode).toBe('IE-001');
      expect(result.totalFobValuePaise).toBe(25000000);
      expect(result.items).toHaveLength(1);
    });

    it('throws NotFoundException for missing invoice', async () => {
      (mockPrisma as any).exportInvoice.findFirst.mockResolvedValue(null);

      await expect(
        service.generateShippingBillData(TEST_TENANT_ID, 'nonexistent'),
      ).rejects.toThrow('not found');
    });
  });

  // ─── generateCertificateOfOrigin ────────────────────────────────

  describe('generateCertificateOfOrigin', () => {
    it('generates certificate of origin data', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        buyerCountry: 'US',
        incoterms: 'FOB',
        items: [
          { description: 'Gold Necklace', hsCode: '7113.19', quantity: 2, weightMg: 30000n, countryOfOrigin: 'IN' },
        ],
        buyer: { firstName: 'Jane', lastName: 'Doe', address: '123 St', city: 'NYC', country: 'US' },
        invoices: [
          { invoiceNumber: 'EI/001', portOfLoading: 'INMAA', portOfDischarge: 'USLAX', createdAt: new Date() },
        ],
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ name: 'CaratFlow Jewelers' });

      const result = await service.generateCertificateOfOrigin(TEST_TENANT_ID, 'order-1');

      expect(result.exporterName).toBe('CaratFlow Jewelers');
      expect(result.consigneeCountry).toBe('US');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].countryOfOrigin).toBe('IN');
    });

    it('handles missing latest invoice gracefully', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({
        id: 'order-1',
        buyerCountry: 'UK',
        incoterms: 'CIF',
        items: [],
        buyer: { firstName: 'A', lastName: 'B', address: '1', city: 'C', country: 'UK' },
        invoices: [],
      });
      mockPrisma.tenant.findUnique.mockResolvedValue({ name: 'Test' });

      const result = await service.generateCertificateOfOrigin(TEST_TENANT_ID, 'order-1');

      expect(result.invoiceNumber).toBe('');
      expect(result.portOfLoading).toBe('');
    });
  });
});
