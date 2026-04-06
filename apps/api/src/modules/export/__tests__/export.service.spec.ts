import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportService } from '../export.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ExportService (Unit)', () => {
  let service: ExportService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    (mockPrisma as any).exportOrder = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    };
    (mockPrisma as any).exportOrderItem = {
      create: vi.fn(),
    };
    (mockPrisma as any).dgftLicense = {
      findMany: vi.fn(),
    };
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    service = new ExportService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
  });

  const baseOrderInput = {
    buyerId: 'buyer-1',
    buyerCountry: 'US',
    locationId: 'loc-1',
    currencyCode: 'USD',
    exchangeRate: 830000,
    incoterms: 'FOB',
    paymentTerms: 'LC 30 days',
    items: [
      {
        description: '22K Gold Necklace',
        quantity: 5,
        unitPricePaise: 10000000,
        hsCode: '7113.19',
        weightMg: 50000,
      },
    ],
  };

  const mockOrder = {
    id: 'order-1',
    tenantId: TEST_TENANT_ID,
    orderNumber: 'EXP/TEST/2604/0001',
    buyerId: 'buyer-1',
    buyerCountry: 'US',
    locationId: 'loc-1',
    status: 'DRAFT',
    currencyCode: 'USD',
    exchangeRate: 830000,
    subtotalPaise: 50000000n,
    dutyPaise: 0n,
    shippingPaise: 0n,
    insurancePaise: 0n,
    totalPaise: 50000000n,
    incoterms: 'FOB',
    paymentTerms: 'LC 30 days',
    notes: null,
    expectedShipDate: null,
    actualShipDate: null,
    items: [
      {
        id: 'item-1',
        description: '22K Gold Necklace',
        quantity: 5,
        unitPricePaise: 10000000n,
        totalPricePaise: 50000000n,
        hsCode: '7113.19',
        weightMg: 50000n,
        metalPurity: null,
        countryOfOrigin: 'IN',
        productId: null,
      },
    ],
    buyer: { firstName: 'John', lastName: 'Doe' },
    location: { name: 'Mumbai Office' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // ─── createExportOrder ──────────────────────────────────────────

  describe('createExportOrder', () => {
    it('creates an export order in DRAFT status', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'buyer-1' });
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-1' });
      mockPrisma.tenant.findUnique.mockResolvedValue({ slug: 'test-store' });
      (mockPrisma as any).exportOrder.count.mockResolvedValue(0);
      (mockPrisma as any).exportOrder.create.mockResolvedValue({});
      (mockPrisma as any).exportOrderItem.create.mockResolvedValue({});
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue(mockOrder);

      const result = await service.createExportOrder(TEST_TENANT_ID, TEST_USER_ID, baseOrderInput as any);

      expect(result.status).toBe('DRAFT');
      expect(result.totalPaise).toBe(50000000);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'export.order.created' }),
      );
    });

    it('calculates subtotal from items', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'buyer-1' });
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-1' });
      mockPrisma.tenant.findUnique.mockResolvedValue({ slug: 'test-store' });
      (mockPrisma as any).exportOrder.count.mockResolvedValue(0);
      (mockPrisma as any).exportOrder.create.mockResolvedValue({});
      (mockPrisma as any).exportOrderItem.create.mockResolvedValue({});
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue(mockOrder);

      const result = await service.createExportOrder(TEST_TENANT_ID, TEST_USER_ID, baseOrderInput as any);

      // 5 x 10000000 = 50000000
      expect(result.subtotalPaise).toBe(50000000);
    });

    it('throws NotFoundException when buyer not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.createExportOrder(TEST_TENANT_ID, TEST_USER_ID, baseOrderInput as any),
      ).rejects.toThrow('Buyer not found');
    });

    it('throws NotFoundException when location not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({ id: 'buyer-1' });
      mockPrisma.location.findFirst.mockResolvedValue(null);

      await expect(
        service.createExportOrder(TEST_TENANT_ID, TEST_USER_ID, baseOrderInput as any),
      ).rejects.toThrow('Location not found');
    });
  });

  // ─── updateOrderStatus ──────────────────────────────────────────

  describe('updateOrderStatus', () => {
    it('transitions DRAFT -> CONFIRMED', async () => {
      (mockPrisma as any).exportOrder.findFirst
        .mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT', orderNumber: 'EXP/001' })
        .mockResolvedValueOnce(mockOrder);
      (mockPrisma as any).exportOrder.update.mockResolvedValue({});

      const result = await service.updateOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'order-1', 'CONFIRMED' as any);
      expect(result).toBeDefined();
    });

    it('transitions CONFIRMED -> IN_PRODUCTION -> READY -> CUSTOMS_CLEARED -> SHIPPED -> DELIVERED', async () => {
      const statuses = ['CONFIRMED', 'IN_PRODUCTION', 'READY', 'CUSTOMS_CLEARED', 'SHIPPED'];
      const targets = ['IN_PRODUCTION', 'READY', 'CUSTOMS_CLEARED', 'SHIPPED', 'DELIVERED'];

      for (let i = 0; i < statuses.length; i++) {
        (mockPrisma as any).exportOrder.findFirst
          .mockResolvedValueOnce({ id: 'order-1', status: statuses[i], orderNumber: 'EXP/001', buyerCountry: 'US', totalPaise: 50000000n })
          .mockResolvedValueOnce({ ...mockOrder, status: targets[i] });
        (mockPrisma as any).exportOrder.update.mockResolvedValue({});

        const result = await service.updateOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'order-1', targets[i] as any);
        expect(result).toBeDefined();
      }
    });

    it('rejects invalid status transition (DRAFT -> SHIPPED)', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({ id: 'order-1', status: 'DRAFT' });

      await expect(
        service.updateOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'order-1', 'SHIPPED' as any),
      ).rejects.toThrow('Cannot transition');
    });

    it('rejects transitions from DELIVERED (terminal state)', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({ id: 'order-1', status: 'DELIVERED' });

      await expect(
        service.updateOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'order-1', 'SHIPPED' as any),
      ).rejects.toThrow('Cannot transition');
    });

    it('publishes event when status changes to SHIPPED', async () => {
      (mockPrisma as any).exportOrder.findFirst
        .mockResolvedValueOnce({ id: 'order-1', status: 'CUSTOMS_CLEARED', orderNumber: 'EXP/001', buyerCountry: 'US' })
        .mockResolvedValueOnce(mockOrder);
      (mockPrisma as any).exportOrder.update.mockResolvedValue({});

      await service.updateOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'order-1', 'SHIPPED' as any);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'export.order.shipped' }),
      );
    });

    it('publishes event when status changes to DELIVERED', async () => {
      (mockPrisma as any).exportOrder.findFirst
        .mockResolvedValueOnce({ id: 'order-1', status: 'SHIPPED', orderNumber: 'EXP/001', totalPaise: 50000000n })
        .mockResolvedValueOnce(mockOrder);
      (mockPrisma as any).exportOrder.update.mockResolvedValue({});

      await service.updateOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'order-1', 'DELIVERED' as any);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'export.order.delivered' }),
      );
    });

    it('throws NotFoundException for missing order', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent', 'CONFIRMED' as any),
      ).rejects.toThrow('not found');
    });
  });

  // ─── cancelOrder ────────────────────────────────────────────────

  describe('cancelOrder', () => {
    it('cancels a DRAFT order', async () => {
      (mockPrisma as any).exportOrder.findFirst
        .mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT', notes: null })
        .mockResolvedValueOnce({ ...mockOrder, status: 'CANCELLED' });
      (mockPrisma as any).exportOrder.update.mockResolvedValue({});

      const result = await service.cancelOrder(TEST_TENANT_ID, TEST_USER_ID, 'order-1', 'Customer requested');
      expect(result).toBeDefined();
    });

    it('rejects cancellation of DELIVERED order', async () => {
      (mockPrisma as any).exportOrder.findFirst.mockResolvedValue({ id: 'order-1', status: 'DELIVERED' });

      await expect(
        service.cancelOrder(TEST_TENANT_ID, TEST_USER_ID, 'order-1', 'reason'),
      ).rejects.toThrow('Cannot cancel');
    });

    it('appends cancellation reason to notes', async () => {
      (mockPrisma as any).exportOrder.findFirst
        .mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT', notes: 'Original note' })
        .mockResolvedValueOnce(mockOrder);
      (mockPrisma as any).exportOrder.update.mockResolvedValue({});

      await service.cancelOrder(TEST_TENANT_ID, TEST_USER_ID, 'order-1', 'Buyer withdrew');

      expect((mockPrisma as any).exportOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: expect.stringContaining('CANCELLED: Buyer withdrew'),
          }),
        }),
      );
    });
  });

  // ─── getDashboard ───────────────────────────────────────────────

  describe('getDashboard', () => {
    it('returns dashboard stats', async () => {
      (mockPrisma as any).exportOrder.count.mockResolvedValue(10);
      (mockPrisma as any).exportOrder.aggregate.mockResolvedValue({ _sum: { totalPaise: 500000000n } });
      (mockPrisma as any).exportOrder.groupBy.mockResolvedValue([
        { buyerCountry: 'US', _count: { id: 5 }, _sum: { totalPaise: 300000000n } },
        { buyerCountry: 'UK', _count: { id: 3 }, _sum: { totalPaise: 200000000n } },
      ]);
      (mockPrisma as any).dgftLicense.findMany.mockResolvedValue([]);
      (mockPrisma as any).exportOrder.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(TEST_TENANT_ID);

      expect(result.totalExportValuePaise).toBe(500000000);
      expect(result.topDestinations).toHaveLength(2);
      expect(result.topDestinations[0].country).toBe('US');
    });
  });
});
