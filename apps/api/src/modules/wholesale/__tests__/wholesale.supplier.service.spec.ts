import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { WholesaleSupplierService } from '../wholesale.supplier.service';

describe('WholesaleSupplierService', () => {
  let service: WholesaleSupplierService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['supplier','supplierRateContract','purchaseOrder'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() }; });
    service = new WholesaleSupplierService(prisma as never);
  });

  describe('getSupplierPerformance', () => {
    it('should calculate metrics from PO data', async () => {
      (prisma as any).supplier.findFirst.mockResolvedValue({ id: 's-1', name: 'Supplier One' });
      (prisma as any).purchaseOrder.findMany.mockResolvedValue([
        { id: 'po-1', status: 'RECEIVED', expectedDate: new Date('2026-06-01'), approvedAt: new Date('2026-05-01'), totalPaise: 1000000n, items: [{ goodsReceiptItems: [{ receivedQuantity: 10, rejectedQuantity: 1, goodsReceipt: { createdAt: new Date('2026-05-15') } }] }] },
      ]);
      const r = await service.getSupplierPerformance(tenantId, 's-1');
      expect(r.totalOrders).toBe(1);
      expect(r.completedOrders).toBe(1);
      expect(r.onTimeDeliveryPercent).toBe(100);
    });
    it('should throw NotFoundException for missing supplier', async () => {
      (prisma as any).supplier.findFirst.mockResolvedValue(null);
      await expect(service.getSupplierPerformance(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
    it('should return 0% quality rejection when no items received', async () => {
      (prisma as any).supplier.findFirst.mockResolvedValue({ id: 's-1', name: 'S' });
      (prisma as any).purchaseOrder.findMany.mockResolvedValue([]);
      const r = await service.getSupplierPerformance(tenantId, 's-1');
      expect(r.qualityRejectionPercent).toBe(0);
    });
    it('should calculate quality rejection percentage', async () => {
      (prisma as any).supplier.findFirst.mockResolvedValue({ id: 's-1', name: 'S' });
      (prisma as any).purchaseOrder.findMany.mockResolvedValue([{ id: 'po-1', status: 'RECEIVED', expectedDate: null, approvedAt: null, totalPaise: 100n, items: [{ goodsReceiptItems: [{ receivedQuantity: 100, rejectedQuantity: 10, goodsReceipt: { createdAt: new Date() } }] }] }]);
      const r = await service.getSupplierPerformance(tenantId, 's-1');
      expect(r.qualityRejectionPercent).toBe(10);
    });
    it('should calculate average lead time', async () => {
      const approved = new Date('2026-05-01');
      const received = new Date('2026-05-11');
      (prisma as any).supplier.findFirst.mockResolvedValue({ id: 's-1', name: 'S' });
      (prisma as any).purchaseOrder.findMany.mockResolvedValue([{ id: 'po-1', status: 'RECEIVED', expectedDate: null, approvedAt: approved, totalPaise: 100n, items: [{ goodsReceiptItems: [{ receivedQuantity: 10, rejectedQuantity: 0, goodsReceipt: { createdAt: received } }] }] }]);
      const r = await service.getSupplierPerformance(tenantId, 's-1');
      expect(r.averageLeadTimeDays).toBe(10);
    });
  });

  describe('createRateContract', () => {
    it('should create rate contract', async () => {
      (prisma as any).supplier.findFirst.mockResolvedValue({ id: 's-1' });
      (prisma as any).supplierRateContract.create.mockResolvedValue({ id: 'rc-1', supplier: { name: 'S' }, tenantId, supplierId: 's-1', metalType: 'GOLD', purityFineness: 916, ratePaisePer10g: 6000000n, validFrom: new Date(), validTo: new Date(), isActive: true, notes: null, createdAt: new Date(), updatedAt: new Date() });
      const r = await service.createRateContract(tenantId, 'u1', { supplierId: 's-1', metalType: 'GOLD', purityFineness: 916, ratePaisePer10g: 6000000, validFrom: new Date(), validTo: new Date() } as any);
      expect(r.metalType).toBe('GOLD');
    });
  });
});
