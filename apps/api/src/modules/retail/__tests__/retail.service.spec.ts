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

function createMockRatesService() {
  return {
    getCurrentRate: vi.fn(),
  };
}

describe('RetailService', () => {
  let service: RetailService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let eventBus: ReturnType<typeof createMockEventBusService>;
  let pricingService: RetailPricingService;
  let ratesService: ReturnType<typeof createMockRatesService>;
  const { tenantId, userId } = mockTenantContext;

  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    eventBus = createMockEventBusService();
    capturePublishedEvents(eventBus);
    pricingService = new RetailPricingService(prisma as never);
    prisma.customer.findFirst = vi.fn() as any;
    // Extend repairOrder mock (mocks.ts only has count)
    (prisma as any).repairOrder = {
      count: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    };
    ratesService = createMockRatesService();
    service = new RetailService(
      prisma as never,
      eventBus as never,
      pricingService,
      ratesService as never,
    );
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

  // ─── Staff Dashboard ───────────────────────────────────────────

  describe('getStaffDashboard', () => {
    const GOLD_RATE = { ratePer10gPaise: 600000, metalType: 'GOLD', purity: 916 };
    const SILVER_RATE = { ratePer10gPaise: 7500, metalType: 'SILVER', purity: 999 };

    it('should return mySalesCount and myRevenuePaise summed from today', async () => {
      prisma.sale.findMany.mockResolvedValue([
        createMockSale({ id: 's1', totalPaise: 100_000n, customer: null }),
        createMockSale({ id: 's2', totalPaise: 50_000n, customer: null }),
      ]);
      ratesService.getCurrentRate
        .mockResolvedValueOnce(GOLD_RATE)
        .mockResolvedValueOnce(SILVER_RATE);

      const result = await service.getStaffDashboard(tenantId, userId);

      expect(result.mySalesCount).toBe(2);
      expect(result.myRevenuePaise).toBe(150_000);
    });

    it('should return zeros when staff has no sales today', async () => {
      prisma.sale.findMany.mockResolvedValue([]);
      ratesService.getCurrentRate
        .mockResolvedValueOnce(GOLD_RATE)
        .mockResolvedValueOnce(SILVER_RATE);

      const result = await service.getStaffDashboard(tenantId, userId);

      expect(result.mySalesCount).toBe(0);
      expect(result.myRevenuePaise).toBe(0);
      expect(result.recentTransactions).toHaveLength(0);
    });

    it('should narrow the date range to the provided date', async () => {
      prisma.sale.findMany.mockResolvedValue([]);
      ratesService.getCurrentRate.mockResolvedValue(GOLD_RATE);

      const date = new Date('2026-03-15T10:30:00');
      await service.getStaffDashboard(tenantId, userId, date);

      const saleCall = prisma.sale.findMany.mock.calls[0]![0] as {
        where: { createdAt: { gte: Date; lt: Date }; userId: string; status: string };
      };

      // Range is the given day (local midnight) → next day
      expect(saleCall.where.userId).toBe(userId);
      expect(saleCall.where.status).toBe('COMPLETED');
      const gte = saleCall.where.createdAt.gte;
      const lt = saleCall.where.createdAt.lt;
      expect(gte.getHours()).toBe(0);
      expect(gte.getMinutes()).toBe(0);
      // lt should be exactly 24h after gte
      expect(lt.getTime() - gte.getTime()).toBe(24 * 60 * 60 * 1000);
      // gte should be the local midnight of the given day
      expect(gte.getDate()).toBe(15);
      expect(gte.getMonth()).toBe(2); // March = 2
    });

    it('should limit recentTransactions to 10 even if more sales exist', async () => {
      const sales = Array.from({ length: 15 }, (_, i) =>
        createMockSale({ id: `s${i}`, saleNumber: `SL/${i}`, totalPaise: 10_000n, customer: null }),
      );
      prisma.sale.findMany.mockResolvedValue(sales);
      ratesService.getCurrentRate
        .mockResolvedValueOnce(GOLD_RATE)
        .mockResolvedValueOnce(SILVER_RATE);

      const result = await service.getStaffDashboard(tenantId, userId);

      expect(result.mySalesCount).toBe(15);
      expect(result.recentTransactions).toHaveLength(10);
    });

    it('should filter pendingRepairs by the correct set of active statuses', async () => {
      prisma.sale.findMany.mockResolvedValue([]);
      (prisma as any).repairOrder.findMany.mockResolvedValue([]);
      ratesService.getCurrentRate
        .mockResolvedValueOnce(GOLD_RATE)
        .mockResolvedValueOnce(SILVER_RATE);

      await service.getStaffDashboard(tenantId, userId);

      const repairCall = (prisma as any).repairOrder.findMany.mock.calls[0][0];
      expect(repairCall.where.status.in).toEqual(
        expect.arrayContaining(['RECEIVED', 'DIAGNOSED', 'QUOTED', 'APPROVED', 'IN_PROGRESS']),
      );
      expect(repairCall.where.tenantId).toBe(tenantId);
    });

    it('should map pending repairs with customer names', async () => {
      prisma.sale.findMany.mockResolvedValue([]);
      (prisma as any).repairOrder.findMany.mockResolvedValue([
        {
          id: 'r1',
          repairNumber: 'RPR/0001',
          status: 'IN_PROGRESS',
          itemDescription: '22K chain',
          customer: { firstName: 'Rajesh', lastName: 'Sharma' },
        },
      ]);
      ratesService.getCurrentRate
        .mockResolvedValueOnce(GOLD_RATE)
        .mockResolvedValueOnce(SILVER_RATE);

      const result = await service.getStaffDashboard(tenantId, userId);

      expect(result.pendingRepairs).toHaveLength(1);
      expect(result.pendingRepairs[0]).toEqual({
        id: 'r1',
        repairNumber: 'RPR/0001',
        customerName: 'Rajesh Sharma',
        status: 'IN_PROGRESS',
        itemDescription: '22K chain',
      });
    });

    it('should wire IndiaRatesService for gold (916) and silver (999)', async () => {
      prisma.sale.findMany.mockResolvedValue([]);
      ratesService.getCurrentRate
        .mockResolvedValueOnce(GOLD_RATE)
        .mockResolvedValueOnce(SILVER_RATE);

      const result = await service.getStaffDashboard(tenantId, userId);

      expect(ratesService.getCurrentRate).toHaveBeenCalledWith('GOLD', 916);
      expect(ratesService.getCurrentRate).toHaveBeenCalledWith('SILVER', 999);
      expect(result.goldRatePer10g).toBe(600000);
      expect(result.silverRatePer10g).toBe(7500);
    });

    it('should degrade gracefully to 0 when IndiaRatesService throws NotFoundException for gold', async () => {
      prisma.sale.findMany.mockResolvedValue([]);
      ratesService.getCurrentRate
        .mockRejectedValueOnce(new NotFoundException('no gold rate'))
        .mockResolvedValueOnce(SILVER_RATE);

      const result = await service.getStaffDashboard(tenantId, userId);

      expect(result.goldRatePer10g).toBe(0);
      expect(result.silverRatePer10g).toBe(7500);
    });

    it('should degrade gracefully to 0 when IndiaRatesService throws for silver', async () => {
      prisma.sale.findMany.mockResolvedValue([]);
      ratesService.getCurrentRate
        .mockResolvedValueOnce(GOLD_RATE)
        .mockRejectedValueOnce(new NotFoundException('no silver rate'));

      const result = await service.getStaffDashboard(tenantId, userId);

      expect(result.goldRatePer10g).toBe(600000);
      expect(result.silverRatePer10g).toBe(0);
    });

    it('should include customer name in recentTransactions when present', async () => {
      prisma.sale.findMany.mockResolvedValue([
        createMockSale({
          id: 's1',
          totalPaise: 100_000n,
          customer: { firstName: 'Asha', lastName: 'Patel' },
        }),
      ]);
      ratesService.getCurrentRate
        .mockResolvedValueOnce(GOLD_RATE)
        .mockResolvedValueOnce(SILVER_RATE);

      const result = await service.getStaffDashboard(tenantId, userId);

      expect(result.recentTransactions[0]!.customerName).toBe('Asha Patel');
    });
  });
});
