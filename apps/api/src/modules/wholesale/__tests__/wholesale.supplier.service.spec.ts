import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { WholesaleSupplierService } from '../wholesale.supplier.service';

describe('WholesaleSupplierService', () => {
  let service: WholesaleSupplierService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  const userId = 'user-1';

  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['supplier', 'purchaseOrder'].forEach((m) => {
      (prisma as any)[m] = {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      };
    });
    service = new WholesaleSupplierService(prisma as never);
  });

  // ─── CRUD ──────────────────────────────────────────────────────

  describe('createSupplier', () => {
    it('persists a supplier with tenant scope and returns mapped response', async () => {
      const now = new Date();
      (prisma as any).supplier.create.mockResolvedValue({
        id: 'mock-uuid',
        tenantId,
        name: 'Acme Gold',
        contactPerson: null,
        email: null,
        phone: null,
        address: null,
        city: null,
        state: null,
        country: null,
        postalCode: null,
        gstinNumber: '27AAAPZ1234B1Z5',
        panNumber: null,
        supplierType: 'GOLD_BAR',
        rating: 4,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.createSupplier(tenantId, userId, {
        name: 'Acme Gold',
        gstinNumber: '27AAAPZ1234B1Z5',
        supplierType: 'GOLD_BAR',
        rating: 4,
      } as never);

      expect(result.name).toBe('Acme Gold');
      expect(result.gstinNumber).toBe('27AAAPZ1234B1Z5');
      expect(result.isActive).toBe(true);
      expect((prisma as any).supplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId, name: 'Acme Gold', createdBy: userId }),
        }),
      );
    });

    it('defaults isActive to true when not provided', async () => {
      const now = new Date();
      (prisma as any).supplier.create.mockResolvedValue({
        id: 'mock-uuid',
        tenantId,
        name: 'X',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      await service.createSupplier(tenantId, userId, { name: 'X' } as never);

      const args = (prisma as any).supplier.create.mock.calls[0][0];
      expect(args.data.isActive).toBe(true);
    });
  });

  describe('getSupplier', () => {
    it('returns supplier filtered by tenantId', async () => {
      const now = new Date();
      (prisma as any).supplier.findFirst.mockResolvedValue({
        id: 's-1',
        tenantId,
        name: 'Acme',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      const r = await service.getSupplier(tenantId, 's-1');

      expect(r.id).toBe('s-1');
      expect((prisma as any).supplier.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId, id: 's-1' }) }),
      );
    });

    it('throws NotFoundException when supplier is missing', async () => {
      (prisma as any).supplier.findFirst.mockResolvedValue(null);
      await expect(service.getSupplier(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listSuppliers', () => {
    it('filters by isActive and supplierType', async () => {
      (prisma as any).supplier.findMany.mockResolvedValue([]);
      (prisma as any).supplier.count.mockResolvedValue(0);

      await service.listSuppliers(
        tenantId,
        { isActive: true, supplierType: 'GOLD_BAR' } as never,
        { page: 1, limit: 10 } as never,
      );

      const where = (prisma as any).supplier.findMany.mock.calls[0][0].where;
      expect(where.tenantId).toBe(tenantId);
      expect(where.isActive).toBe(true);
      expect(where.supplierType).toBe('GOLD_BAR');
    });

    it('applies search to name/gstin/pan via OR', async () => {
      (prisma as any).supplier.findMany.mockResolvedValue([]);
      (prisma as any).supplier.count.mockResolvedValue(0);

      await service.listSuppliers(
        tenantId,
        { search: 'Acme' } as never,
        { page: 1, limit: 10 } as never,
      );

      const where = (prisma as any).supplier.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual(
        expect.arrayContaining([
          { name: { contains: 'Acme' } },
          { gstinNumber: { contains: 'Acme' } },
          { panNumber: { contains: 'Acme' } },
        ]),
      );
    });

    it('paginates correctly with page 2 / limit 5', async () => {
      (prisma as any).supplier.findMany.mockResolvedValue([
        { id: 's-6', tenantId, name: 'S6', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ]);
      (prisma as any).supplier.count.mockResolvedValue(11);

      const r = await service.listSuppliers(tenantId, {} as never, {
        page: 2,
        limit: 5,
      } as never);

      expect(r.page).toBe(2);
      expect(r.limit).toBe(5);
      expect(r.totalPages).toBe(3);
      expect(r.hasNext).toBe(true);
      expect(r.hasPrevious).toBe(true);
      expect((prisma as any).supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });
  });

  describe('updateSupplier', () => {
    it('applies partial merge of fields (only provided keys)', async () => {
      const now = new Date();
      (prisma as any).supplier.findFirst
        .mockResolvedValueOnce({ id: 's-1', tenantId, name: 'Old' })
        .mockResolvedValueOnce({
          id: 's-1',
          tenantId,
          name: 'Old',
          contactPerson: 'Ravi',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      (prisma as any).supplier.update.mockResolvedValue({});

      const r = await service.updateSupplier(tenantId, userId, 's-1', {
        contactPerson: 'Ravi',
      } as never);

      expect(r.contactPerson).toBe('Ravi');
      const updateArg = (prisma as any).supplier.update.mock.calls[0][0];
      expect(updateArg.data.contactPerson).toBe('Ravi');
      // name was not included in the update payload (partial merge)
      expect(updateArg.data.name).toBeUndefined();
      expect(updateArg.data.updatedBy).toBe(userId);
    });

    it('throws NotFoundException when supplier does not exist', async () => {
      (prisma as any).supplier.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSupplier(tenantId, userId, 'x', { name: 'Y' } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateSupplier', () => {
    it('sets isActive=false', async () => {
      const now = new Date();
      (prisma as any).supplier.findFirst
        .mockResolvedValueOnce({ id: 's-1', tenantId, name: 'S' })
        .mockResolvedValueOnce({
          id: 's-1',
          tenantId,
          name: 'S',
          isActive: false,
          createdAt: now,
          updatedAt: now,
        });
      (prisma as any).supplier.update.mockResolvedValue({});

      const r = await service.deactivateSupplier(tenantId, userId, 's-1');

      expect(r.isActive).toBe(false);
      expect((prisma as any).supplier.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's-1' },
          data: expect.objectContaining({ isActive: false }),
        }),
      );
    });
  });

  // ─── Performance Metrics ───────────────────────────────────────

  describe('getSupplierPerformance', () => {
    it('computes on-time delivery, quality, lead time, and purchase value from PO data', async () => {
      (prisma as any).supplier.findFirst.mockResolvedValue({ id: 's-1', name: 'Supplier One' });
      (prisma as any).purchaseOrder.findMany.mockResolvedValue([
        {
          id: 'po-1',
          status: 'RECEIVED',
          expectedDate: new Date('2026-06-01'),
          approvedAt: new Date('2026-05-01'),
          totalPaise: 1_000_000n,
          items: [
            {
              goodsReceiptItems: [
                {
                  receivedQuantity: 10,
                  rejectedQuantity: 1,
                  goodsReceipt: { createdAt: new Date('2026-05-15') },
                },
              ],
            },
          ],
        },
      ]);

      const r = await service.getSupplierPerformance(tenantId, 's-1');

      expect(r.totalOrders).toBe(1);
      expect(r.completedOrders).toBe(1);
      expect(r.onTimeDeliveryPercent).toBe(100);
      expect(r.qualityRejectionPercent).toBe(10);
      expect(r.averageLeadTimeDays).toBe(14);
      expect(r.totalPurchaseValuePaise).toBe(1_000_000);
    });

    it('throws NotFoundException for missing supplier', async () => {
      (prisma as any).supplier.findFirst.mockResolvedValue(null);
      await expect(service.getSupplierPerformance(tenantId, 'x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns zeros when the supplier has no purchase orders', async () => {
      (prisma as any).supplier.findFirst.mockResolvedValue({ id: 's-1', name: 'S' });
      (prisma as any).purchaseOrder.findMany.mockResolvedValue([]);

      const r = await service.getSupplierPerformance(tenantId, 's-1');

      expect(r.totalOrders).toBe(0);
      expect(r.completedOrders).toBe(0);
      expect(r.qualityRejectionPercent).toBe(0);
      expect(r.onTimeDeliveryPercent).toBe(0);
      expect(r.averageLeadTimeDays).toBe(0);
      expect(r.totalPurchaseValuePaise).toBe(0);
    });

    it('flags a late delivery as 0% on-time', async () => {
      (prisma as any).supplier.findFirst.mockResolvedValue({ id: 's-1', name: 'S' });
      (prisma as any).purchaseOrder.findMany.mockResolvedValue([
        {
          id: 'po-1',
          status: 'RECEIVED',
          expectedDate: new Date('2026-05-01'),
          approvedAt: new Date('2026-04-01'),
          totalPaise: 100n,
          items: [
            {
              goodsReceiptItems: [
                {
                  receivedQuantity: 1,
                  rejectedQuantity: 0,
                  goodsReceipt: { createdAt: new Date('2026-05-15') }, // 14 days late
                },
              ],
            },
          ],
        },
      ]);

      const r = await service.getSupplierPerformance(tenantId, 's-1');
      expect(r.onTimeDeliveryPercent).toBe(0);
    });

    it('calculates average lead time correctly across multiple POs', async () => {
      (prisma as any).supplier.findFirst.mockResolvedValue({ id: 's-1', name: 'S' });
      (prisma as any).purchaseOrder.findMany.mockResolvedValue([
        {
          id: 'po-1',
          status: 'RECEIVED',
          expectedDate: null,
          approvedAt: new Date('2026-05-01'),
          totalPaise: 100n,
          items: [
            {
              goodsReceiptItems: [
                {
                  receivedQuantity: 1,
                  rejectedQuantity: 0,
                  goodsReceipt: { createdAt: new Date('2026-05-11') }, // 10 days
                },
              ],
            },
          ],
        },
        {
          id: 'po-2',
          status: 'RECEIVED',
          expectedDate: null,
          approvedAt: new Date('2026-06-01'),
          totalPaise: 100n,
          items: [
            {
              goodsReceiptItems: [
                {
                  receivedQuantity: 1,
                  rejectedQuantity: 0,
                  goodsReceipt: { createdAt: new Date('2026-06-21') }, // 20 days
                },
              ],
            },
          ],
        },
      ]);

      const r = await service.getSupplierPerformance(tenantId, 's-1');
      expect(r.averageLeadTimeDays).toBe(15);
    });
  });

  describe('listSuppliersWithPerformance', () => {
    it('maps each supplier to its performance metrics', async () => {
      (prisma as any).supplier.findMany.mockResolvedValue([
        { id: 's-1', name: 'A' },
        { id: 's-2', name: 'B' },
      ]);
      (prisma as any).supplier.count.mockResolvedValue(2);

      // getSupplierPerformance for each supplier re-calls findFirst + purchaseOrder.findMany.
      (prisma as any).supplier.findFirst
        .mockResolvedValueOnce({ id: 's-1', name: 'A' })
        .mockResolvedValueOnce({ id: 's-2', name: 'B' });
      (prisma as any).purchaseOrder.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const r = await service.listSuppliersWithPerformance(
        tenantId,
        {} as never,
        { page: 1, limit: 10 } as never,
      );

      expect(r.items).toHaveLength(2);
      expect(r.items[0]!.supplierId).toBe('s-1');
      expect(r.items[1]!.supplierId).toBe('s-2');
      expect(r.total).toBe(2);
    });

    it('passes isActive/supplierType filters to supplier query', async () => {
      (prisma as any).supplier.findMany.mockResolvedValue([]);
      (prisma as any).supplier.count.mockResolvedValue(0);

      await service.listSuppliersWithPerformance(
        tenantId,
        { isActive: true, supplierType: 'KARIGAR' } as never,
        { page: 1, limit: 10 } as never,
      );

      const where = (prisma as any).supplier.findMany.mock.calls[0][0].where;
      expect(where).toEqual(
        expect.objectContaining({ tenantId, isActive: true, supplierType: 'KARIGAR' }),
      );
    });
  });
});
