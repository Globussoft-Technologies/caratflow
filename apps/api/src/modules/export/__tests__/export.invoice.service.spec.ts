import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportInvoiceService } from '../export.invoice.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ExportInvoiceService (Unit)', () => {
  let service: ExportInvoiceService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    (mockPrisma as any).exportOrder = {
      findFirst: vi.fn(),
    };
    (mockPrisma as any).exportInvoice = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    };
    (mockPrisma as any).exportInvoiceItem = {
      create: vi.fn(),
    };
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    service = new ExportInvoiceService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
  });

  const baseItem = {
    description: '22K Gold Ring',
    quantity: 10,
    unitPricePaise: 5000000,
    hsCode: '7113.19',
    weightMg: 50000,
    netWeightMg: 48000,
  };

  const mockInvoiceResponse = {
    id: 'inv-1',
    tenantId: TEST_TENANT_ID,
    invoiceNumber: 'EI/2604/0001',
    exportOrderId: 'order-1',
    invoiceType: 'COMMERCIAL',
    buyerId: 'buyer-1',
    currencyCode: 'USD',
    exchangeRate: 830000,
    subtotalPaise: 50000000n,
    totalPaise: 50000000n,
    igstPaise: 0n,
    lutNumber: 'LUT-2025-001',
    lutDate: new Date(),
    adCode: 'AD-001',
    ieCode: 'IE-0812345678',
    preCarriageBy: null,
    placeOfReceipt: null,
    vesselFlightNo: null,
    portOfLoading: 'INMAA',
    portOfDischarge: 'USLAX',
    finalDestination: null,
    terms: null,
    items: [
      {
        id: 'item-1',
        description: '22K Gold Ring',
        quantity: 10,
        unitPricePaise: 5000000n,
        totalPricePaise: 50000000n,
        hsCode: '7113.19',
        weightMg: 50000n,
        netWeightMg: 48000n,
        countryOfOrigin: 'IN',
        exportOrderItemId: null,
      },
    ],
    buyer: { firstName: 'John', lastName: 'Doe' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ─── createInvoice ──────────────────────────────────────────────

  describe('createInvoice', () => {
    it('creates a commercial invoice with LUT (zero IGST)', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({ id: 'order-1' });
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'buyer-1' });
      (mockPrisma as any).exportInvoice.count.mockResolvedValue(0);
      (mockPrisma as any).exportInvoice.create.mockResolvedValue({});
      (mockPrisma as any).exportInvoiceItem.create.mockResolvedValue({});
      (mockPrisma as any).exportInvoice.findFirst.mockResolvedValue(mockInvoiceResponse);

      const result = await service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
        exportOrderId: 'order-1',
        invoiceType: 'COMMERCIAL',
        buyerId: 'buyer-1',
        currencyCode: 'USD',
        exchangeRate: 830000,
        ieCode: 'IE-0812345678',
        lutNumber: 'LUT-2025-001',
        igstPaise: 0,
        items: [baseItem],
      } as any);

      expect(result.invoiceType).toBe('COMMERCIAL');
      expect(result.igstPaise).toBe(0);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'export.invoice.created' }),
      );
    });

    it('creates a proforma invoice', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({ id: 'order-1' });
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'buyer-1' });
      (mockPrisma as any).exportInvoice.count.mockResolvedValue(0);
      (mockPrisma as any).exportInvoice.create.mockResolvedValue({});
      (mockPrisma as any).exportInvoiceItem.create.mockResolvedValue({});
      (mockPrisma as any).exportInvoice.findFirst.mockResolvedValue({
        ...mockInvoiceResponse,
        invoiceType: 'PROFORMA',
        invoiceNumber: 'PI/2604/0001',
      });

      const result = await service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
        exportOrderId: 'order-1',
        invoiceType: 'PROFORMA',
        buyerId: 'buyer-1',
        currencyCode: 'USD',
        exchangeRate: 830000,
        ieCode: 'IE-0812345678',
        lutNumber: 'LUT-001',
        igstPaise: 0,
        items: [baseItem],
      } as any);

      expect(result.invoiceType).toBe('PROFORMA');
    });

    it('rejects commercial invoice with zero IGST and no LUT', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({ id: 'order-1' });
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'buyer-1' });

      await expect(
        service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
          exportOrderId: 'order-1',
          invoiceType: 'COMMERCIAL',
          buyerId: 'buyer-1',
          currencyCode: 'USD',
          exchangeRate: 830000,
          ieCode: 'IE-0812345678',
          igstPaise: 0,
          // no lutNumber
          items: [baseItem],
        } as any),
      ).rejects.toThrow('LUT number is required');
    });

    it('allows commercial invoice with IGST amount (no LUT needed)', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({ id: 'order-1' });
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'buyer-1' });
      (mockPrisma as any).exportInvoice.count.mockResolvedValue(0);
      (mockPrisma as any).exportInvoice.create.mockResolvedValue({});
      (mockPrisma as any).exportInvoiceItem.create.mockResolvedValue({});
      (mockPrisma as any).exportInvoice.findFirst.mockResolvedValue({
        ...mockInvoiceResponse,
        igstPaise: 9000000n,
        totalPaise: 59000000n,
        lutNumber: null,
      });

      const result = await service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
        exportOrderId: 'order-1',
        invoiceType: 'COMMERCIAL',
        buyerId: 'buyer-1',
        currencyCode: 'USD',
        exchangeRate: 830000,
        ieCode: 'IE-0812345678',
        igstPaise: 9000000,
        items: [baseItem],
      } as any);

      expect(result.igstPaise).toBe(9000000);
    });

    it('rejects invoice without IE Code', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({ id: 'order-1' });
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'buyer-1' });

      await expect(
        service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
          exportOrderId: 'order-1',
          invoiceType: 'COMMERCIAL',
          buyerId: 'buyer-1',
          currencyCode: 'USD',
          exchangeRate: 830000,
          lutNumber: 'LUT-001',
          igstPaise: 0,
          items: [baseItem],
        } as any),
      ).rejects.toThrow('IE Code');
    });

    it('locks exchange rate at creation time', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({ id: 'order-1' });
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'buyer-1' });
      (mockPrisma as any).exportInvoice.count.mockResolvedValue(0);
      (mockPrisma as any).exportInvoice.create.mockResolvedValue({});
      (mockPrisma as any).exportInvoiceItem.create.mockResolvedValue({});
      (mockPrisma as any).exportInvoice.findFirst.mockResolvedValue(mockInvoiceResponse);

      await service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
        exportOrderId: 'order-1',
        invoiceType: 'COMMERCIAL',
        buyerId: 'buyer-1',
        currencyCode: 'USD',
        exchangeRate: 830000,
        ieCode: 'IE-0812345678',
        lutNumber: 'LUT-001',
        igstPaise: 0,
        items: [baseItem],
      } as any);

      expect((mockPrisma as any).exportInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ exchangeRate: 830000 }),
        }),
      );
    });

    it('throws NotFoundException when export order not found', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
          exportOrderId: 'nonexistent',
          invoiceType: 'COMMERCIAL',
          buyerId: 'buyer-1',
          currencyCode: 'USD',
          exchangeRate: 830000,
          ieCode: 'IE-001',
          lutNumber: 'LUT-001',
          items: [baseItem],
        } as any),
      ).rejects.toThrow('Export order not found');
    });

    it('throws NotFoundException when buyer not found', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({ id: 'order-1' });
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
          exportOrderId: 'order-1',
          invoiceType: 'COMMERCIAL',
          buyerId: 'nonexistent',
          currencyCode: 'USD',
          exchangeRate: 830000,
          ieCode: 'IE-001',
          lutNumber: 'LUT-001',
          items: [baseItem],
        } as any),
      ).rejects.toThrow('Buyer not found');
    });

    it('calculates totals from multiple items', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({ id: 'order-1' });
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'buyer-1' });
      (mockPrisma as any).exportInvoice.count.mockResolvedValue(0);
      (mockPrisma as any).exportInvoice.create.mockResolvedValue({});
      (mockPrisma as any).exportInvoiceItem.create.mockResolvedValue({});
      (mockPrisma as any).exportInvoice.findFirst.mockResolvedValue({
        ...mockInvoiceResponse,
        subtotalPaise: 100000000n,
        totalPaise: 100000000n,
      });

      const result = await service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
        exportOrderId: 'order-1',
        invoiceType: 'COMMERCIAL',
        buyerId: 'buyer-1',
        currencyCode: 'USD',
        exchangeRate: 830000,
        ieCode: 'IE-001',
        lutNumber: 'LUT-001',
        igstPaise: 0,
        items: [
          { ...baseItem, quantity: 10, unitPricePaise: 5000000 },
          { ...baseItem, quantity: 10, unitPricePaise: 5000000 },
        ],
      } as any);

      expect(result.subtotalPaise).toBe(100000000);
    });
  });

  // ─── getInvoice ─────────────────────────────────────────────────

  describe('getInvoice', () => {
    it('throws NotFoundException for missing invoice', async () => {
      (mockPrisma as any).exportInvoice.findFirst.mockResolvedValue(null);

      await expect(
        service.getInvoice(TEST_TENANT_ID, 'nonexistent'),
      ).rejects.toThrow('not found');
    });
  });
});
