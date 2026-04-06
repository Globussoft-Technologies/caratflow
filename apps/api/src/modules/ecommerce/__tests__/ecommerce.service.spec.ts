import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EcommerceService } from '../ecommerce.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    salesChannel: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    onlineOrder: {
      findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), aggregate: vi.fn(),
    },
    onlineOrderItem: { create: vi.fn() },
  };
}

describe('EcommerceService (Unit)', () => {
  let service: EcommerceService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    mockEventBus = createMockEventBus();
    service = new EcommerceService(mockPrisma as any, mockEventBus as any);
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
  });

  const baseOrder = {
    id: 'o-1', tenantId: TEST_TENANT_ID, orderNumber: 'ON/WEB/2604/0001',
    channelId: 'ch-1', externalOrderId: null, customerId: null,
    customerEmail: 'c@e.com', customerPhone: null, customerName: 'Customer',
    status: 'PENDING', subtotalPaise: 100000n, shippingPaise: 0n, taxPaise: 3000n,
    discountPaise: 0n, totalPaise: 103000n, currencyCode: 'INR',
    shippingAddress: null, billingAddress: null, notes: null, cancelReason: null,
    placedAt: new Date(), confirmedAt: null, shippedAt: null, deliveredAt: null,
    createdAt: new Date(), updatedAt: new Date(), items: [],
  };

  describe('createOrder', () => {
    it('creates an online order with items and publishes event', async () => {
      mockPrisma.onlineOrder.findFirst.mockResolvedValueOnce(null); // idempotency check
      mockPrisma.salesChannel.findFirst.mockResolvedValue({ channelType: 'WEBSITE', name: 'Web' });
      mockPrisma.onlineOrder.count.mockResolvedValue(0);
      mockPrisma.onlineOrder.create.mockResolvedValue(baseOrder);
      mockPrisma.onlineOrderItem.create.mockResolvedValue({});
      mockPrisma.onlineOrder.findFirst.mockResolvedValueOnce(baseOrder);

      const result = await service.createOrder(TEST_TENANT_ID, TEST_USER_ID, {
        channelId: 'ch-1',
        subtotalPaise: 100000,
        totalPaise: 103000,
        items: [{ title: 'Gold Ring', quantity: 1, unitPricePaise: 100000, totalPaise: 100000 }],
      });

      expect(result.orderNumber).toBeDefined();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ecommerce.order.received' }),
      );
    });

    it('returns existing order for duplicate externalOrderId (idempotent)', async () => {
      mockPrisma.onlineOrder.findFirst.mockResolvedValue(baseOrder);

      const result = await service.createOrder(TEST_TENANT_ID, TEST_USER_ID, {
        channelId: 'ch-1',
        externalOrderId: 'ext-123',
        subtotalPaise: 100000,
        totalPaise: 103000,
        items: [{ title: 'Ring', quantity: 1, unitPricePaise: 100000, totalPaise: 100000 }],
      });

      expect(result.id).toBe('o-1');
      expect(mockPrisma.onlineOrder.create).not.toHaveBeenCalled();
    });
  });

  describe('getOrder', () => {
    it('returns order when found', async () => {
      mockPrisma.onlineOrder.findFirst.mockResolvedValue(baseOrder);
      const result = await service.getOrder(TEST_TENANT_ID, 'o-1');
      expect(result.id).toBe('o-1');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.onlineOrder.findFirst.mockResolvedValue(null);
      await expect(service.getOrder(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOrderStatus', () => {
    it('sets confirmedAt timestamp on CONFIRMED', async () => {
      mockPrisma.onlineOrder.findFirst
        .mockResolvedValueOnce({ ...baseOrder, status: 'PENDING' })
        .mockResolvedValueOnce({ ...baseOrder, status: 'CONFIRMED', confirmedAt: new Date() });
      mockPrisma.onlineOrder.update.mockResolvedValue({});

      const result = await service.updateOrderStatus(TEST_TENANT_ID, TEST_USER_ID, {
        orderId: 'o-1', status: 'CONFIRMED' as any,
      });

      expect(mockPrisma.onlineOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ confirmedAt: expect.any(Date) }),
        }),
      );
    });

    it('sets shippedAt on SHIPPED', async () => {
      mockPrisma.onlineOrder.findFirst
        .mockResolvedValueOnce({ ...baseOrder, status: 'CONFIRMED' })
        .mockResolvedValueOnce({ ...baseOrder, status: 'SHIPPED' });
      mockPrisma.onlineOrder.update.mockResolvedValue({});

      await service.updateOrderStatus(TEST_TENANT_ID, TEST_USER_ID, {
        orderId: 'o-1', status: 'SHIPPED' as any,
      });

      expect(mockPrisma.onlineOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ shippedAt: expect.any(Date) }),
        }),
      );
    });

    it('requires cancelReason for CANCELLED status', async () => {
      mockPrisma.onlineOrder.findFirst.mockResolvedValue(baseOrder);

      await expect(
        service.updateOrderStatus(TEST_TENANT_ID, TEST_USER_ID, {
          orderId: 'o-1', status: 'CANCELLED' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelOrder', () => {
    it('cancels an order with reason', async () => {
      mockPrisma.onlineOrder.findFirst
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce({ ...baseOrder, status: 'CANCELLED' });
      mockPrisma.onlineOrder.update.mockResolvedValue({});

      const result = await service.cancelOrder(TEST_TENANT_ID, TEST_USER_ID, 'o-1', 'Customer request');
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('getDashboard', () => {
    it('returns dashboard stats', async () => {
      mockPrisma.onlineOrder.count.mockResolvedValue(5);
      mockPrisma.onlineOrder.aggregate.mockResolvedValue({ _sum: { totalPaise: 500000n } });
      mockPrisma.salesChannel.findMany.mockResolvedValue([]);
      mockPrisma.onlineOrder.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(TEST_TENANT_ID);

      expect(result.totalOnlineOrders).toBe(5);
      expect(result.onlineRevenuePaise).toBe(500000);
    });
  });

  describe('listOrders', () => {
    it('returns paginated orders', async () => {
      mockPrisma.onlineOrder.findMany.mockResolvedValue([baseOrder]);
      mockPrisma.onlineOrder.count.mockResolvedValue(1);

      const result = await service.listOrders(TEST_TENANT_ID, {}, { page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('refundOrder', () => {
    it('sets status to REFUNDED', async () => {
      mockPrisma.onlineOrder.findFirst
        .mockResolvedValueOnce(baseOrder)
        .mockResolvedValueOnce({ ...baseOrder, status: 'REFUNDED' });
      mockPrisma.onlineOrder.update.mockResolvedValue({});

      const result = await service.refundOrder(TEST_TENANT_ID, TEST_USER_ID, 'o-1');
      expect(result.status).toBe('REFUNDED');
    });
  });
});
