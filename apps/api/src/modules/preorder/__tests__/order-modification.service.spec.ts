import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { OrderModificationService } from '../order-modification.service';

describe('OrderModificationService', () => {
  let service: OrderModificationService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['onlineOrder','onlineOrderItem','orderModificationRequest'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), deleteMany: vi.fn(), findUnique: vi.fn() }; });
    service = new OrderModificationService(prisma as never);
  });

  const mkReq = (o: Record<string,unknown> = {}) => ({ id: 'mr-1', tenantId, orderId: 'o-1', customerId: 'c1', customer: { firstName: 'A', lastName: 'B' }, modificationType: 'ADDRESS_CHANGE', originalData: {}, requestedData: {}, status: 'PENDING', reason: null, reviewedBy: null, reviewedAt: null, autoApplyWindow: 30, createdAt: new Date(), updatedAt: new Date(), ...o });

  describe('requestModification', () => {
    it('should create modification request', async () => {
      (prisma as any).onlineOrder.findFirst.mockResolvedValue({ id: 'o-1', status: 'PENDING', shippingAddress: {}, billingAddress: {}, placedAt: new Date() });
      (prisma as any).orderModificationRequest.create.mockResolvedValue(mkReq());
      (prisma as any).onlineOrder.findFirst
        .mockResolvedValueOnce({ id: 'o-1', status: 'PENDING', shippingAddress: {}, billingAddress: {}, placedAt: new Date() })
        .mockResolvedValueOnce({ orderNumber: 'ON-1' });
      (prisma as any).orderModificationRequest.create.mockResolvedValue(mkReq());
      (prisma as any).orderModificationRequest.findFirst.mockResolvedValue(mkReq());
      const r = await service.requestModification(tenantId, userId, { orderId: 'o-1', customerId: 'c1', modificationType: 'ADDRESS_CHANGE', requestedData: {} } as any);
      expect(r.status).toBe('PENDING');
    });
    it('should reject modification for shipped order', async () => {
      (prisma as any).onlineOrder.findFirst.mockResolvedValue({ id: 'o-1', status: 'SHIPPED' });
      await expect(service.requestModification(tenantId, userId, { orderId: 'o-1', customerId: 'c1', modificationType: 'ADDRESS_CHANGE', requestedData: {} } as any)).rejects.toThrow(BadRequestException);
    });
    it('should throw NotFoundException for missing order', async () => {
      (prisma as any).onlineOrder.findFirst.mockResolvedValue(null);
      await expect(service.requestModification(tenantId, userId, { orderId: 'x', customerId: 'c1', modificationType: 'ADDRESS_CHANGE', requestedData: {} } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reviewModification', () => {
    it('should approve and apply modification', async () => {
      const req = mkReq({ modificationType: 'ADDRESS_CHANGE', requestedData: { shippingAddress: { city: 'Delhi' } } });
      (prisma as any).orderModificationRequest.findFirst
        .mockResolvedValueOnce(req) // reviewModification fetch
        .mockResolvedValueOnce(req) // applyModification fetch
        .mockResolvedValueOnce(mkReq({ status: 'APPROVED', modificationType: 'ADDRESS_CHANGE' })); // getModification
      (prisma as any).onlineOrder.update.mockResolvedValue({});
      (prisma as any).orderModificationRequest.update.mockResolvedValue({});
      (prisma as any).onlineOrder.findFirst.mockResolvedValue({ orderNumber: 'ON-1' });
      const r = await service.reviewModification(tenantId, userId, { requestId: 'mr-1', approved: true } as any);
      expect(r.status).toBe('APPROVED');
    });
    it('should reject modification', async () => {
      (prisma as any).orderModificationRequest.findFirst
        .mockResolvedValueOnce(mkReq()) // reviewModification fetch
        .mockResolvedValueOnce(mkReq({ status: 'REJECTED' })); // getModification
      (prisma as any).orderModificationRequest.update.mockResolvedValue({});
      (prisma as any).onlineOrder.findFirst.mockResolvedValue({ orderNumber: 'ON-1' });
      const r = await service.reviewModification(tenantId, userId, { requestId: 'mr-1', approved: false, reason: 'Not allowed' } as any);
      expect(r.status).toBe('REJECTED');
    });
    it('should reject non-pending request', async () => {
      (prisma as any).orderModificationRequest.findFirst.mockResolvedValue(mkReq({ status: 'APPROVED' }));
      await expect(service.reviewModification(tenantId, userId, { requestId: 'mr-1', approved: true } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('autoApplyModification', () => {
    it('should auto-apply address change', async () => {
      (prisma as any).orderModificationRequest.findFirst
        .mockResolvedValueOnce(mkReq({ requestedData: { shippingAddress: { city: 'Delhi' } } }))
        .mockResolvedValueOnce(mkReq({ status: 'AUTO_APPLIED' }));
      (prisma as any).onlineOrder.update.mockResolvedValue({});
      (prisma as any).orderModificationRequest.update.mockResolvedValue({});
      (prisma as any).onlineOrder.findFirst.mockResolvedValue({ orderNumber: 'ON-1' });
      const r = await service.autoApplyModification(tenantId, userId, 'mr-1');
      expect(r.status).toBe('AUTO_APPLIED');
    });
    it('should reject non-address auto-apply', async () => {
      (prisma as any).orderModificationRequest.findFirst.mockResolvedValue(mkReq({ modificationType: 'ITEM_CHANGE' }));
      await expect(service.autoApplyModification(tenantId, userId, 'mr-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getModification', () => {
    it('should return modification with order number', async () => {
      (prisma as any).orderModificationRequest.findFirst.mockResolvedValue(mkReq());
      (prisma as any).onlineOrder.findFirst.mockResolvedValue({ orderNumber: 'ON-1' });
      const r = await service.getModification(tenantId, 'mr-1');
      expect(r.orderNumber).toBe('ON-1');
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).orderModificationRequest.findFirst.mockResolvedValue(null);
      await expect(service.getModification(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getModificationRequests', () => {
    it('should return paginated list', async () => {
      (prisma as any).orderModificationRequest.findMany.mockResolvedValue([mkReq()]);
      (prisma as any).orderModificationRequest.count.mockResolvedValue(1);
      (prisma as any).onlineOrder.findMany.mockResolvedValue([{ id: 'o-1', orderNumber: 'ON-1' }]);
      const r = await service.getModificationRequests(tenantId, {}, { page: 1, limit: 10 } as any);
      expect(r.total).toBe(1);
    });
  });
});
