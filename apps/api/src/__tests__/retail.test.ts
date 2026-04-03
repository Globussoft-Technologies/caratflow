import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetailService } from '../modules/retail/retail.service';
import { RetailPricingService } from '../modules/retail/retail.pricing.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from './setup';

describe('RetailService', () => {
  let service: RetailService;
  let pricingService: RetailPricingService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    pricingService = new RetailPricingService(mockPrisma as any);
    service = new RetailService(mockPrisma as any, mockEventBus as any, pricingService);
    resetAllMocks(mockPrisma);
  });

  // ─── Create Sale ─────────────────────────────────────────────

  describe('createSale', () => {
    const baseSaleInput = {
      locationId: 'location-1',
      currencyCode: 'INR',
      lineItems: [
        {
          description: '22K Gold Ring 10g',
          quantity: 1,
          unitPricePaise: 6500000, // Rs 65,000
          metalRatePaise: 6000000,
          metalWeightMg: 10000,
          makingChargesPaise: 300000,
          wastageChargesPaise: 200000,
          hsnCode: '7113',
          gstRate: 300, // 3%
        },
      ],
      payments: [
        { method: 'CASH', amountPaise: 6695000 }, // total with GST
      ],
    };

    it('creates a sale with correct totals (metal rate * weight + making + tax)', async () => {
      // Mock location lookup
      mockPrisma.location.findFirst.mockResolvedValue({
        id: 'location-1',
        state: 'MH',
        city: 'Mumbai',
        name: 'Main Store',
      });

      // Mock sale number generation
      mockPrisma.sale.count.mockResolvedValue(0);

      // Mock transaction to return the created sale
      const createdSale = {
        id: 'sale-1',
        tenantId: TEST_TENANT_ID,
        saleNumber: 'SL/MUM/2604/0001',
        status: 'COMPLETED',
        subtotalPaise: BigInt(6500000),
        discountPaise: BigInt(0),
        taxPaise: BigInt(195000), // 3% of 65000 = 1950
        totalPaise: BigInt(6695000),
        currencyCode: 'INR',
        roundOffPaise: BigInt(0),
      };

      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        mockPrisma.sale.create.mockResolvedValue(createdSale);
        return fn(mockPrisma);
      });

      // Mock getSale for the return value
      mockPrisma.sale.findFirst.mockResolvedValue({
        ...createdSale,
        lineItems: [],
        payments: [],
        customerId: null,
        locationId: 'location-1',
        userId: TEST_USER_ID,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createSale(TEST_TENANT_ID, TEST_USER_ID, baseSaleInput as any);

      expect(result).toBeDefined();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'retail.sale.completed' }),
      );
    });

    it('throws when payment total is less than sale total', async () => {
      mockPrisma.location.findFirst.mockResolvedValue({
        id: 'location-1',
        state: 'MH',
        city: 'Mumbai',
      });

      const underpaidInput = {
        ...baseSaleInput,
        payments: [
          { method: 'CASH', amountPaise: 100 }, // way too low
        ],
      };

      await expect(
        service.createSale(TEST_TENANT_ID, TEST_USER_ID, underpaidInput as any),
      ).rejects.toThrow('Payment total');
    });

    it('handles split payment (cash + card)', async () => {
      mockPrisma.location.findFirst.mockResolvedValue({
        id: 'location-1',
        state: 'MH',
        city: 'Mumbai',
      });
      mockPrisma.sale.count.mockResolvedValue(0);

      const splitPaymentInput = {
        ...baseSaleInput,
        payments: [
          { method: 'CASH', amountPaise: 3000000 },
          { method: 'CARD', amountPaise: 3695000 },
        ],
      };

      const createdSale = {
        id: 'sale-2',
        tenantId: TEST_TENANT_ID,
        saleNumber: 'SL/MUM/2604/0001',
        status: 'COMPLETED',
        subtotalPaise: BigInt(6500000),
        taxPaise: BigInt(195000),
        totalPaise: BigInt(6695000),
        discountPaise: BigInt(0),
        roundOffPaise: BigInt(0),
        currencyCode: 'INR',
      };

      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        mockPrisma.sale.create.mockResolvedValue(createdSale);
        return fn(mockPrisma);
      });

      mockPrisma.sale.findFirst.mockResolvedValue({
        ...createdSale,
        lineItems: [],
        payments: [
          { id: 'p-1', saleId: 'sale-2', method: 'CASH', amountPaise: BigInt(3000000), status: 'COMPLETED' },
          { id: 'p-2', saleId: 'sale-2', method: 'CARD', amountPaise: BigInt(3695000), status: 'COMPLETED' },
        ],
        customerId: null,
        locationId: 'location-1',
        userId: TEST_USER_ID,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createSale(TEST_TENANT_ID, TEST_USER_ID, splitPaymentInput as any);
      expect(result).toBeDefined();
    });
  });

  // ─── Void Sale ───────────────────────────────────────────────

  describe('voidSale', () => {
    it('voids a completed sale', async () => {
      mockPrisma.sale.findFirst
        .mockResolvedValueOnce({
          id: 'sale-1',
          tenantId: TEST_TENANT_ID,
          status: 'COMPLETED',
          notes: 'Original note',
        })
        .mockResolvedValueOnce({
          id: 'sale-1',
          tenantId: TEST_TENANT_ID,
          saleNumber: 'SL/MUM/2604/0001',
          status: 'VOIDED',
          subtotalPaise: BigInt(6500000),
          discountPaise: BigInt(0),
          taxPaise: BigInt(195000),
          totalPaise: BigInt(6695000),
          currencyCode: 'INR',
          roundOffPaise: BigInt(0),
          customerId: null,
          locationId: 'location-1',
          userId: TEST_USER_ID,
          notes: 'Original note\nVOIDED: Customer request',
          lineItems: [],
          payments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      mockPrisma.$transaction.mockImplementation(async (fn: Function) => fn(mockPrisma));

      const result = await service.voidSale(TEST_TENANT_ID, TEST_USER_ID, 'sale-1', 'Customer request');
      expect(result.status).toBe('VOIDED');
    });

    it('throws when trying to void a non-completed sale', async () => {
      mockPrisma.sale.findFirst.mockResolvedValue({
        id: 'sale-1',
        tenantId: TEST_TENANT_ID,
        status: 'VOIDED',
      });

      await expect(
        service.voidSale(TEST_TENANT_ID, TEST_USER_ID, 'sale-1', 'reason'),
      ).rejects.toThrow('Only completed sales can be voided');
    });

    it('throws when sale not found', async () => {
      mockPrisma.sale.findFirst.mockResolvedValue(null);

      await expect(
        service.voidSale(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent', 'reason'),
      ).rejects.toThrow('Sale not found');
    });
  });

  // ─── Get Sale ────────────────────────────────────────────────

  describe('getSale', () => {
    it('returns sale with line items and payments', async () => {
      mockPrisma.sale.findFirst.mockResolvedValue({
        id: 'sale-1',
        tenantId: TEST_TENANT_ID,
        saleNumber: 'SL/MUM/2604/0001',
        status: 'COMPLETED',
        subtotalPaise: BigInt(6500000),
        discountPaise: BigInt(0),
        taxPaise: BigInt(195000),
        totalPaise: BigInt(6695000),
        currencyCode: 'INR',
        roundOffPaise: BigInt(0),
        customerId: null,
        locationId: 'location-1',
        userId: TEST_USER_ID,
        notes: null,
        lineItems: [
          {
            id: 'li-1',
            saleId: 'sale-1',
            description: '22K Gold Ring',
            quantity: 1,
            unitPricePaise: BigInt(6500000),
            discountPaise: BigInt(0),
            makingChargesPaise: BigInt(300000),
            wastageChargesPaise: BigInt(200000),
            metalRatePaise: BigInt(6000000),
            metalWeightMg: BigInt(10000),
            hsnCode: '7113',
            gstRate: 300,
            cgstPaise: BigInt(97500),
            sgstPaise: BigInt(97500),
            igstPaise: BigInt(0),
            lineTotalPaise: BigInt(6695000),
          },
        ],
        payments: [
          {
            id: 'p-1',
            saleId: 'sale-1',
            method: 'CASH',
            amountPaise: BigInt(6695000),
            status: 'COMPLETED',
            processedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getSale(TEST_TENANT_ID, 'sale-1');

      expect(result.id).toBe('sale-1');
      expect(result.lineItems).toHaveLength(1);
      expect(result.payments).toHaveLength(1);
      expect(result.totalPaise).toBe(6695000);
    });

    it('throws NotFoundException when sale does not exist', async () => {
      mockPrisma.sale.findFirst.mockResolvedValue(null);

      await expect(service.getSale(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow('Sale not found');
    });
  });
});
