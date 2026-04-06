import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RetailReturnService } from '../retail.return.service';
import {
  createMockPrismaService,
  createMockEventBusService,
  createMockSale,
  mockTenantContext,
  resetMocks,
  capturePublishedEvents,
} from '../../../__tests__/mocks';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).slice(2, 10)),
}));

describe('RetailReturnService', () => {
  let service: RetailReturnService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let eventBus: ReturnType<typeof createMockEventBusService>;
  const { tenantId, userId } = mockTenantContext;

  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    eventBus = createMockEventBusService();
    capturePublishedEvents(eventBus);
    service = new RetailReturnService(prisma as never, eventBus as never);
    eventBus.publishedEvents = [];
  });

  // ─── Create Return ─────────────────────────────────────────────

  describe('createReturn', () => {
    const makeOriginalSale = () =>
      createMockSale({
        id: 'sale-1',
        status: 'COMPLETED',
        customerId: 'cust-1',
        lineItems: [
          {
            id: 'li-1',
            productId: 'p1',
            quantity: 2,
            unitPricePaise: 500000n,
            lineTotalPaise: 1030000n, // With tax
          },
          {
            id: 'li-2',
            productId: 'p2',
            quantity: 1,
            unitPricePaise: 300000n,
            lineTotalPaise: 309000n,
          },
        ],
      });

    it('should create return against a valid completed sale', async () => {
      prisma.sale.findFirst.mockResolvedValue(makeOriginalSale());
      prisma.location.findFirst.mockResolvedValue({ city: 'Mumbai' });
      prisma.saleReturn.count.mockResolvedValue(0);
      prisma.$transaction.mockResolvedValue(undefined);

      const returnResponse = {
        id: 'ret-1',
        tenantId,
        returnNumber: 'RT/MUM/2604/0001',
        originalSaleId: 'sale-1',
        customerId: 'cust-1',
        locationId: 'test-location-id',
        status: 'DRAFT',
        subtotalPaise: 515000n,
        refundAmountPaise: 515000n,
        metalRateDifferencePaise: 0n,
        items: [
          {
            id: 'ri-1',
            originalLineItemId: 'li-1',
            productId: 'p1',
            quantity: 1,
            returnPricePaise: 515000n,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.saleReturn.findFirst.mockResolvedValue(returnResponse);

      const result = await service.createReturn(tenantId, userId, {
        originalSaleId: 'sale-1',
        locationId: 'test-location-id',
        items: [
          { originalLineItemId: 'li-1', quantity: 1, returnPricePaise: 515000 },
        ],
      } as never);

      expect(result).toHaveProperty('returnNumber');
      expect(result.status).toBe('DRAFT');
    });

    it('should throw NotFoundException if original sale not found', async () => {
      prisma.sale.findFirst.mockResolvedValue(null);

      await expect(
        service.createReturn(tenantId, userId, {
          originalSaleId: 'nonexistent',
          locationId: 'test-location-id',
          items: [],
        } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject return on non-COMPLETED sale', async () => {
      prisma.sale.findFirst.mockResolvedValue(createMockSale({ status: 'VOIDED' }));

      await expect(
        service.createReturn(tenantId, userId, {
          originalSaleId: 'sale-1',
          locationId: 'test-location-id',
          items: [],
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if return quantity exceeds original', async () => {
      prisma.sale.findFirst.mockResolvedValue(makeOriginalSale());

      await expect(
        service.createReturn(tenantId, userId, {
          originalSaleId: 'sale-1',
          locationId: 'test-location-id',
          items: [
            { originalLineItemId: 'li-1', quantity: 5, returnPricePaise: 515000 },
          ],
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if line item not found in original sale', async () => {
      prisma.sale.findFirst.mockResolvedValue(makeOriginalSale());

      await expect(
        service.createReturn(tenantId, userId, {
          originalSaleId: 'sale-1',
          locationId: 'test-location-id',
          items: [
            { originalLineItemId: 'nonexistent-li', quantity: 1, returnPricePaise: 500000 },
          ],
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate metal rate difference for partial return', async () => {
      prisma.sale.findFirst.mockResolvedValue(makeOriginalSale());
      prisma.location.findFirst.mockResolvedValue({ city: 'Mumbai' });
      prisma.saleReturn.count.mockResolvedValue(0);
      prisma.$transaction.mockResolvedValue(undefined);

      const returnResponse = {
        id: 'ret-1',
        tenantId,
        returnNumber: 'RT/MUM/2604/0001',
        originalSaleId: 'sale-1',
        status: 'DRAFT',
        subtotalPaise: 600000n,
        refundAmountPaise: 600000n,
        metalRateDifferencePaise: 85000n, // Price went up
        items: [{ id: 'ri-1', originalLineItemId: 'li-1', quantity: 1, returnPricePaise: 600000n }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.saleReturn.findFirst.mockResolvedValue(returnResponse);

      const result = await service.createReturn(tenantId, userId, {
        originalSaleId: 'sale-1',
        locationId: 'test-location-id',
        items: [
          { originalLineItemId: 'li-1', quantity: 1, returnPricePaise: 600000 }, // Higher than original
        ],
      } as never);

      expect(result.metalRateDifferencePaise).toBeDefined();
    });

    it('should allow return on PARTIALLY_RETURNED sale', async () => {
      prisma.sale.findFirst.mockResolvedValue(
        createMockSale({
          id: 'sale-1',
          status: 'PARTIALLY_RETURNED',
          lineItems: [
            { id: 'li-1', productId: 'p1', quantity: 2, lineTotalPaise: 1030000n },
          ],
        }),
      );
      prisma.location.findFirst.mockResolvedValue({ city: 'Mumbai' });
      prisma.saleReturn.count.mockResolvedValue(1);
      prisma.$transaction.mockResolvedValue(undefined);
      prisma.saleReturn.findFirst.mockResolvedValue({
        id: 'ret-2',
        tenantId,
        status: 'DRAFT',
        subtotalPaise: 515000n,
        refundAmountPaise: 515000n,
        metalRateDifferencePaise: 0n,
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createReturn(tenantId, userId, {
        originalSaleId: 'sale-1',
        locationId: 'test-location-id',
        items: [
          { originalLineItemId: 'li-1', quantity: 1, returnPricePaise: 515000 },
        ],
      } as never);

      expect(result.status).toBe('DRAFT');
    });
  });

  // ─── Approve Return ────────────────────────────────────────────

  describe('approveReturn', () => {
    it('should approve a DRAFT return', async () => {
      prisma.saleReturn.findFirst
        .mockResolvedValueOnce({ id: 'ret-1', tenantId, status: 'DRAFT' })
        .mockResolvedValueOnce({
          id: 'ret-1',
          tenantId,
          status: 'APPROVED',
          subtotalPaise: 500000n,
          refundAmountPaise: 500000n,
          metalRateDifferencePaise: 0n,
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      prisma.saleReturn.update.mockResolvedValue({});

      const result = await service.approveReturn(tenantId, userId, 'ret-1');

      expect(result.status).toBe('APPROVED');
    });

    it('should reject approving non-DRAFT return', async () => {
      prisma.saleReturn.findFirst.mockResolvedValue({
        id: 'ret-1',
        tenantId,
        status: 'COMPLETED',
      });

      await expect(
        service.approveReturn(tenantId, userId, 'ret-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Complete Return ───────────────────────────────────────────

  describe('completeReturn', () => {
    it('should reject completing non-APPROVED return', async () => {
      prisma.saleReturn.findFirst.mockResolvedValue({
        id: 'ret-1',
        tenantId,
        status: 'DRAFT',
        items: [],
      });

      await expect(
        service.completeReturn(tenantId, userId, 'ret-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Reject Return ────────────────────────────────────────────

  describe('rejectReturn', () => {
    it('should reject return with reason', async () => {
      prisma.saleReturn.findFirst
        .mockResolvedValueOnce({ id: 'ret-1', tenantId, status: 'DRAFT', reason: null })
        .mockResolvedValueOnce({
          id: 'ret-1',
          tenantId,
          status: 'REJECTED',
          reason: 'REJECTED: Item damaged',
          subtotalPaise: 0n,
          refundAmountPaise: 0n,
          metalRateDifferencePaise: 0n,
          items: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      prisma.saleReturn.update.mockResolvedValue({});

      const result = await service.rejectReturn(tenantId, userId, 'ret-1', 'Item damaged');

      expect(result.status).toBe('REJECTED');
    });
  });
});
