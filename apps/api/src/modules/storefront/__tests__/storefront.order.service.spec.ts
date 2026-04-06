import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { StorefrontOrderService } from '../storefront.order.service';

describe('StorefrontOrderService', () => {
  let service: StorefrontOrderService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['onlineOrder','cart','cartItem'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() }; });
    (prisma as any).onlineOrderItem = { findMany: vi.fn() };
    prisma.product.findMany = vi.fn() as any;
    prisma.product.findFirst = vi.fn() as any;
    service = new StorefrontOrderService(prisma as never);
  });

  const mkOrder = (o: Record<string,unknown> = {}) => ({ id: 'o-1', orderNumber: 'ON-001', status: 'CONFIRMED', subtotalPaise: 50000n, shippingPaise: 200n, taxPaise: 1500n, discountPaise: 0n, totalPaise: 51700n, currencyCode: 'INR', shippingAddress: {}, items: [{ id: 'i-1', productId: 'p1', title: 'Ring', quantity: 1, unitPricePaise: 50000n, totalPaise: 50000n, sku: 'S', weightMg: 5000 }], shipments: [], payments: [], placedAt: new Date(), confirmedAt: null, shippedAt: null, deliveredAt: null, cancelReason: null, createdAt: new Date(), updatedAt: new Date(), ...o });

  describe('getMyOrders', () => {
    it('should return paginated orders', async () => {
      (prisma as any).onlineOrder.findMany.mockResolvedValue([mkOrder()]);
      (prisma as any).onlineOrder.count.mockResolvedValue(1);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', images: ['img.jpg'] }] as any);
      const r = await service.getMyOrders(tenantId, 'c1', { page: 1, limit: 10 } as any);
      expect(r.total).toBe(1);
    });
  });

  describe('getOrderById', () => {
    it('should return order with details', async () => {
      (prisma as any).onlineOrder.findFirst.mockResolvedValue(mkOrder());
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', images: [] }] as any);
      const r = await service.getOrderById(tenantId, 'c1', 'o-1');
      expect(r.id).toBe('o-1');
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).onlineOrder.findFirst.mockResolvedValue(null);
      await expect(service.getOrderById(tenantId, 'c1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('requestReturn', () => {
    it('should update order status to RETURNED', async () => {
      (prisma as any).onlineOrder.findFirst.mockResolvedValue(mkOrder({ status: 'DELIVERED', items: [{ id: 'i-1' }] }));
      (prisma as any).onlineOrder.update.mockResolvedValue({});
      await service.requestReturn(tenantId, 'c1', 'o-1', [{ orderItemId: 'i-1', quantity: 1, reason: 'Defective' }], 'Defective');
      expect((prisma as any).onlineOrder.update).toHaveBeenCalled();
    });
    it('should reject return for non-delivered order', async () => {
      (prisma as any).onlineOrder.findFirst.mockResolvedValue(mkOrder({ status: 'CONFIRMED' }));
      await expect(service.requestReturn(tenantId, 'c1', 'o-1', [], 'reason')).rejects.toThrow(BadRequestException);
    });
  });

  describe('reorder', () => {
    it('should create new cart from order items', async () => {
      (prisma as any).onlineOrder.findFirst.mockResolvedValue(mkOrder({ items: [{ productId: 'p1', quantity: 1 }], currencyCode: 'INR' }));
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', isActive: true } as any);
      (prisma as any).cart.create.mockResolvedValue({ id: 'cart-1' });
      (prisma as any).cartItem.create.mockResolvedValue({});
      const r = await service.reorder(tenantId, 'c1', 'o-1');
      expect(r).toBeDefined();
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).onlineOrder.findFirst.mockResolvedValue(null);
      await expect(service.reorder(tenantId, 'c1', 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
