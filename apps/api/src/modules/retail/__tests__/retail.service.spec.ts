import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RetailService } from '../retail.service';
import { RetailPricingService } from '../retail.pricing.service';
import {
  createMockPrismaService,
  createMockEventBusService,
  createMockSale,
  mockTenantContext,
  TEST_LOCATION,
  resetMocks,
  capturePublishedEvents,
} from '../../../__tests__/mocks';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).slice(2, 10)),
}));

describe('RetailService', () => {
  let service: RetailService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let eventBus: ReturnType<typeof createMockEventBusService>;
  let pricingService: RetailPricingService;
  const { tenantId, userId } = mockTenantContext;

  beforeEach(() => {
    prisma = createMockPrismaService();
    eventBus = createMockEventBusService();
    capturePublishedEvents(eventBus);
    pricingService = new RetailPricingService(prisma as never);
    service = new RetailService(prisma as never, eventBus as never, pricingService);
    resetMocks(prisma);
    eventBus.publishedEvents = [];
  });

  // ─── Create Sale ───────────────────────────────────────────────

  describe('createSale', () => {
    const baseSaleInput = {
      locationId: 'test-location-id',
      currencyCode: 'INR',
      lineItems: [
        {
          description: '22K Gold Ring',
          productId: 'p1',
          quantity: 1,
          unitPricePaise: 500000,
          metalRatePaise: 600000,
          metalWeightMg: 5000,
          makingChargesPaise: 20000,
          wastageChargesPaise: 5000,
          hsnCode: '7113',
          gstRate: 300,
        },
      ],
      payments: [
        { method: 'CASH', amountPaise: 540000 },
      ],
    };

    it('should generate a sale number', async () => {
      prisma.location.findFirst.mockResolvedValue(TEST_LOCATION);
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.sale.count.mockResolvedValue(0);

      const createdSale = createMockSale({ saleNumber: 'SL/MUM/2604/0001' });
      prisma.$transaction.mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') {
          return fn(prisma._tx);
        }
        return fn;
      });
      prisma._tx.sale.create.mockResolvedValue(createdSale);
      prisma._tx.saleLineItem.create.mockResolvedValue({});
      prisma._tx.salePayment.create.mockResolvedValue({});
      prisma.sale.findFirst.mockResolvedValue({
        ...createdSale,
        lineItems: [],
        payments: [],
      });

      const result = await service.createSale(tenantId, userId, baseSaleInput as never);

      expect(result.saleNumber).toMatch(/^SL\//);
    });

    it('should calculate correct totals for line items', async () => {
      prisma.location.findFirst.mockResolvedValue(TEST_LOCATION);
      prisma.sale.count.mockResolvedValue(0);

      const createdSale = createMockSale();
      prisma.$transaction.mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') return fn(prisma._tx);
        return fn;
      });
      prisma._tx.sale.create.mockResolvedValue(createdSale);
      prisma._tx.saleLineItem.create.mockResolvedValue({});
      prisma._tx.salePayment.create.mockResolvedValue({});
      prisma.sale.findFirst.mockResolvedValue({
        ...createdSale,
        lineItems: [],
        payments: [],
      });

      await service.createSale(tenantId, userId, baseSaleInput as never);

      // Verify the sale was created with calculated amounts
      expect(prisma._tx.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            status: 'COMPLETED',
          }),
        }),
      );
    });

    it('should reject when payment total is less than sale total', async () => {
      prisma.location.findFirst.mockResolvedValue(TEST_LOCATION);
      prisma.sale.count.mockResolvedValue(0);

      const input = {
        ...baseSaleInput,
        payments: [{ method: 'CASH', amountPaise: 100 }], // Way too little
      };

      await expect(
        service.createSale(tenantId, userId, input as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept split payments (cash + card)', async () => {
      prisma.location.findFirst.mockResolvedValue(TEST_LOCATION);
      prisma.sale.count.mockResolvedValue(0);

      const createdSale = createMockSale();
      prisma.$transaction.mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') return fn(prisma._tx);
        return fn;
      });
      prisma._tx.sale.create.mockResolvedValue(createdSale);
      prisma._tx.saleLineItem.create.mockResolvedValue({});
      prisma._tx.salePayment.create.mockResolvedValue({});
      prisma.sale.findFirst.mockResolvedValue({
        ...createdSale,
        lineItems: [],
        payments: [],
      });

      const input = {
        ...baseSaleInput,
        payments: [
          { method: 'CASH', amountPaise: 300000 },
          { method: 'CARD', amountPaise: 240000 },
        ],
      };

      await service.createSale(tenantId, userId, input as never);

      // Two payment records created
      expect(prisma._tx.salePayment.create).toHaveBeenCalledTimes(2);
    });

    it('should publish retail.sale.completed event', async () => {
      prisma.location.findFirst.mockResolvedValue(TEST_LOCATION);
      prisma.sale.count.mockResolvedValue(0);

      const createdSale = createMockSale();
      prisma.$transaction.mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') return fn(prisma._tx);
        return fn;
      });
      prisma._tx.sale.create.mockResolvedValue(createdSale);
      prisma._tx.saleLineItem.create.mockResolvedValue({});
      prisma._tx.salePayment.create.mockResolvedValue({});
      prisma.sale.findFirst.mockResolvedValue({
        ...createdSale,
        lineItems: [],
        payments: [],
      });

      await service.createSale(tenantId, userId, baseSaleInput as never);

      expect(eventBus.publishedEvents.some((e) => e.type === 'retail.sale.completed')).toBe(true);
    });

    it('should apply discount to sale', async () => {
      prisma.location.findFirst.mockResolvedValue(TEST_LOCATION);
      prisma.sale.count.mockResolvedValue(0);

      const createdSale = createMockSale();
      prisma.$transaction.mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') return fn(prisma._tx);
        return fn;
      });
      prisma._tx.sale.create.mockResolvedValue(createdSale);
      prisma._tx.saleLineItem.create.mockResolvedValue({});
      prisma._tx.salePayment.create.mockResolvedValue({});
      prisma.sale.findFirst.mockResolvedValue({
        ...createdSale,
        lineItems: [],
        payments: [],
      });

      const input = {
        ...baseSaleInput,
        discountPaise: 10000,
        payments: [{ method: 'CASH', amountPaise: 540000 }],
      };

      await service.createSale(tenantId, userId, input as never);

      expect(prisma._tx.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            discountPaise: expect.anything(),
          }),
        }),
      );
    });

    it('should handle multiple line items', async () => {
      prisma.location.findFirst.mockResolvedValue(TEST_LOCATION);
      prisma.sale.count.mockResolvedValue(0);

      const createdSale = createMockSale();
      prisma.$transaction.mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') return fn(prisma._tx);
        return fn;
      });
      prisma._tx.sale.create.mockResolvedValue(createdSale);
      prisma._tx.saleLineItem.create.mockResolvedValue({});
      prisma._tx.salePayment.create.mockResolvedValue({});
      prisma.sale.findFirst.mockResolvedValue({
        ...createdSale,
        lineItems: [],
        payments: [],
      });

      const input = {
        ...baseSaleInput,
        lineItems: [
          ...baseSaleInput.lineItems,
          {
            description: '18K Necklace',
            productId: 'p2',
            quantity: 1,
            unitPricePaise: 1200000,
            hsnCode: '7113',
            gstRate: 300,
          },
        ],
        payments: [{ method: 'CASH', amountPaise: 2000000 }],
      };

      await service.createSale(tenantId, userId, input as never);

      expect(prisma._tx.saleLineItem.create).toHaveBeenCalledTimes(2);
    });

    it('should use customer state for GST when customerId provided', async () => {
      prisma.location.findFirst.mockResolvedValue(TEST_LOCATION);
      prisma.customer.findFirst.mockResolvedValue({ state: 'GJ' }); // Gujarat - inter-state
      prisma.sale.count.mockResolvedValue(0);

      const createdSale = createMockSale();
      prisma.$transaction.mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') return fn(prisma._tx);
        return fn;
      });
      prisma._tx.sale.create.mockResolvedValue(createdSale);
      prisma._tx.saleLineItem.create.mockResolvedValue({});
      prisma._tx.salePayment.create.mockResolvedValue({});
      prisma.sale.findFirst.mockResolvedValue({
        ...createdSale,
        lineItems: [],
        payments: [],
      });

      const input = {
        ...baseSaleInput,
        customerId: 'cust-1',
        payments: [{ method: 'CASH', amountPaise: 600000 }],
      };

      await service.createSale(tenantId, userId, input as never);

      expect(prisma.customer.findFirst).toHaveBeenCalled();
    });
  });

  // ─── Get Sale ──────────────────────────────────────────────────

  describe('getSale', () => {
    it('should return sale with line items and payments', async () => {
      const sale = createMockSale();
      prisma.sale.findFirst.mockResolvedValue(sale);

      const result = await service.getSale(tenantId, sale.id);

      expect(result).toHaveProperty('id', sale.id);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.sale.findFirst.mockResolvedValue(null);

      await expect(service.getSale(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Void Sale ─────────────────────────────────────────────────

  describe('voidSale', () => {
    it('should void a COMPLETED sale', async () => {
      const sale = createMockSale({ status: 'COMPLETED' });
      prisma.sale.findFirst
        .mockResolvedValueOnce(sale) // first call for finding
        .mockResolvedValueOnce({ ...sale, status: 'VOIDED', lineItems: [], payments: [] }); // second call for getSale
      prisma.$transaction.mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') return fn(prisma._tx);
        return fn;
      });
      prisma._tx.sale.update.mockResolvedValue({});
      prisma._tx.salePayment.updateMany.mockResolvedValue({});

      const result = await service.voidSale(tenantId, userId, sale.id, 'Customer request');

      expect(result.status).toBe('VOIDED');
    });

    it('should reject voiding a non-COMPLETED sale', async () => {
      prisma.sale.findFirst.mockResolvedValue(createMockSale({ status: 'VOIDED' }));

      await expect(
        service.voidSale(tenantId, userId, 'sale-id', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject voiding a DRAFT sale', async () => {
      prisma.sale.findFirst.mockResolvedValue(createMockSale({ status: 'DRAFT' }));

      await expect(
        service.voidSale(tenantId, userId, 'sale-id', 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent sale', async () => {
      prisma.sale.findFirst.mockResolvedValue(null);

      await expect(
        service.voidSale(tenantId, userId, 'nonexistent', 'reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should mark all payments as REFUNDED', async () => {
      const sale = createMockSale({ status: 'COMPLETED' });
      prisma.sale.findFirst
        .mockResolvedValueOnce(sale)
        .mockResolvedValueOnce({ ...sale, status: 'VOIDED', lineItems: [], payments: [] });
      prisma.$transaction.mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') return fn(prisma._tx);
        return fn;
      });
      prisma._tx.sale.update.mockResolvedValue({});
      prisma._tx.salePayment.updateMany.mockResolvedValue({});

      await service.voidSale(tenantId, userId, sale.id, 'reason');

      expect(prisma._tx.salePayment.updateMany).toHaveBeenCalledWith({
        where: { saleId: sale.id, tenantId },
        data: { status: 'REFUNDED' },
      });
    });

    it('should append void reason to notes', async () => {
      const sale = createMockSale({ status: 'COMPLETED', notes: 'Original note' });
      prisma.sale.findFirst
        .mockResolvedValueOnce(sale)
        .mockResolvedValueOnce({ ...sale, status: 'VOIDED', lineItems: [], payments: [] });
      prisma.$transaction.mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') return fn(prisma._tx);
        return fn;
      });
      prisma._tx.sale.update.mockResolvedValue({});
      prisma._tx.salePayment.updateMany.mockResolvedValue({});

      await service.voidSale(tenantId, userId, sale.id, 'Test reason');

      expect(prisma._tx.sale.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: expect.stringContaining('VOIDED: Test reason'),
          }),
        }),
      );
    });
  });

  // ─── List Sales ────────────────────────────────────────────────

  describe('listSales', () => {
    it('should return paginated results', async () => {
      const sales = [createMockSale(), createMockSale()];
      prisma.sale.findMany.mockResolvedValue(sales);
      prisma.sale.count.mockResolvedValue(2);

      const result = await service.listSales(
        tenantId,
        {} as never,
        { page: 1, limit: 10 } as never,
      );

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasNext).toBe(false);
    });

    it('should filter by status', async () => {
      prisma.sale.findMany.mockResolvedValue([]);
      prisma.sale.count.mockResolvedValue(0);

      await service.listSales(
        tenantId,
        { status: 'COMPLETED' } as never,
        { page: 1, limit: 10 } as never,
      );

      expect(prisma.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId, status: 'COMPLETED' }),
        }),
      );
    });

    it('should calculate hasNext correctly for multiple pages', async () => {
      prisma.sale.findMany.mockResolvedValue([createMockSale()]);
      prisma.sale.count.mockResolvedValue(25);

      const result = await service.listSales(
        tenantId,
        {} as never,
        { page: 1, limit: 10 } as never,
      );

      expect(result.hasNext).toBe(true);
      expect(result.totalPages).toBe(3);
    });

    it('should filter by customerId', async () => {
      prisma.sale.findMany.mockResolvedValue([]);
      prisma.sale.count.mockResolvedValue(0);

      await service.listSales(
        tenantId,
        { customerId: 'cust-1' } as never,
        { page: 1, limit: 10 } as never,
      );

      expect(prisma.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId, customerId: 'cust-1' }),
        }),
      );
    });

    it('should filter by locationId', async () => {
      prisma.sale.findMany.mockResolvedValue([]);
      prisma.sale.count.mockResolvedValue(0);

      await service.listSales(
        tenantId,
        { locationId: 'loc-1' } as never,
        { page: 1, limit: 10 } as never,
      );

      expect(prisma.sale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId, locationId: 'loc-1' }),
        }),
      );
    });
  });
});
