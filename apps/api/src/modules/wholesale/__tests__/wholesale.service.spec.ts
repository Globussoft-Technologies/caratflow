import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WholesaleService } from '../wholesale.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('WholesaleService (Unit)', () => {
  let service: WholesaleService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    service = new WholesaleService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
  });

  // ─── Purchase Order Creation ───────────────────────────────────

  describe('createPurchaseOrder', () => {
    it('generates PO number and calculates totals', async () => {
      mockPrisma.supplier.findFirst.mockResolvedValue({ id: 'sup-1', name: 'Gold Supplier' });
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-1', name: 'Main Store' });
      mockPrisma.tenant.findUnique.mockResolvedValue({ slug: 'test-store' });
      mockPrisma.purchaseOrder.count.mockResolvedValue(3);
      mockPrisma.purchaseOrder.create.mockResolvedValue({});
      mockPrisma.purchaseOrderItem.create.mockResolvedValue({});

      // For getPurchaseOrder at the end
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        tenantId: TEST_TENANT_ID,
        poNumber: 'PO/TEST/2604/0004',
        supplierId: 'sup-1',
        locationId: 'loc-1',
        status: 'DRAFT',
        subtotalPaise: BigInt(15000000),
        taxPaise: BigInt(0),
        totalPaise: BigInt(15000000),
        currencyCode: 'INR',
        items: [
          { id: 'item-1', description: 'Gold Bar 10g', quantity: 3, unitPricePaise: BigInt(5000000), totalPaise: BigInt(15000000), receivedQuantity: 0 },
        ],
        supplier: { name: 'Gold Supplier' },
        location: { name: 'Main Store' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createPurchaseOrder(TEST_TENANT_ID, TEST_USER_ID, {
        supplierId: 'sup-1',
        locationId: 'loc-1',
        items: [
          { description: 'Gold Bar 10g', quantity: 3, unitPricePaise: 5000000 },
        ],
      } as any);

      expect(result.status).toBe('DRAFT');
      expect(result.totalPaise).toBe(15000000);
      expect(result.poNumber).toBeDefined();
    });

    it('throws when supplier not found', async () => {
      mockPrisma.supplier.findFirst.mockResolvedValue(null);

      await expect(
        service.createPurchaseOrder(TEST_TENANT_ID, TEST_USER_ID, {
          supplierId: 'nonexistent',
          locationId: 'loc-1',
          items: [{ description: 'Test', quantity: 1, unitPricePaise: 100000 }],
        } as any),
      ).rejects.toThrow('Supplier not found');
    });

    it('throws when location not found', async () => {
      mockPrisma.supplier.findFirst.mockResolvedValue({ id: 'sup-1' });
      mockPrisma.location.findFirst.mockResolvedValue(null);

      await expect(
        service.createPurchaseOrder(TEST_TENANT_ID, TEST_USER_ID, {
          supplierId: 'sup-1',
          locationId: 'nonexistent',
          items: [{ description: 'Test', quantity: 1, unitPricePaise: 100000 }],
        } as any),
      ).rejects.toThrow('Location not found');
    });

    it('calculates correct subtotal from multiple items', async () => {
      mockPrisma.supplier.findFirst.mockResolvedValue({ id: 'sup-1' });
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-1' });
      mockPrisma.tenant.findUnique.mockResolvedValue({ slug: 'test' });
      mockPrisma.purchaseOrder.count.mockResolvedValue(0);

      let capturedPo: any;
      mockPrisma.purchaseOrder.create.mockImplementation(async (args: any) => {
        capturedPo = args.data;
        return {};
      });
      mockPrisma.purchaseOrderItem.create.mockResolvedValue({});

      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        tenantId: TEST_TENANT_ID,
        poNumber: 'PO/TEST/2604/0001',
        status: 'DRAFT',
        subtotalPaise: BigInt(7000000),
        taxPaise: BigInt(0),
        totalPaise: BigInt(7000000),
        items: [],
        supplier: { name: 'Test' },
        location: { name: 'Test' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createPurchaseOrder(TEST_TENANT_ID, TEST_USER_ID, {
        supplierId: 'sup-1',
        locationId: 'loc-1',
        items: [
          { description: 'Gold Bar', quantity: 2, unitPricePaise: 2000000 },
          { description: 'Silver Bar', quantity: 3, unitPricePaise: 1000000 },
        ],
      } as any);

      // 2*2000000 + 3*1000000 = 7000000
      expect(capturedPo.subtotalPaise).toBe(7000000n);
    });
  });

  // ─── Goods Receipt ─────────────────────────────────────────────

  describe('createGoodsReceipt', () => {
    it('partial receipt updates PO item quantities', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        tenantId: TEST_TENANT_ID,
        status: 'SENT',
        supplierId: 'sup-1',
        locationId: 'loc-1',
        totalPaise: BigInt(10000000),
        items: [
          { id: 'poi-1', quantity: 10, receivedQuantity: 0 },
        ],
      });

      mockPrisma.goodsReceipt.create.mockResolvedValue({});
      mockPrisma.goodsReceiptItem.create.mockResolvedValue({});
      mockPrisma.purchaseOrderItem.update.mockResolvedValue({});
      mockPrisma.purchaseOrderItem.findMany.mockResolvedValue([
        { id: 'poi-1', quantity: 10, receivedQuantity: 5 },
      ]);
      mockPrisma.purchaseOrder.update.mockResolvedValue({});

      // For getGoodsReceipt
      mockPrisma.goodsReceipt.findFirst.mockResolvedValue({
        id: 'gr-1',
        tenantId: TEST_TENANT_ID,
        receiptNumber: 'GR/2604/0001',
        purchaseOrderId: 'po-1',
        status: 'DRAFT',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        receivedDate: new Date(),
      });

      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: 'PARTIALLY_RECEIVED',
      });

      await service.createGoodsReceipt(TEST_TENANT_ID, TEST_USER_ID, {
        purchaseOrderId: 'po-1',
        items: [
          { poItemId: 'poi-1', productId: 'prod-1', receivedQuantity: 5, weightMg: 50000 },
        ],
      } as any);

      expect(mockPrisma.purchaseOrderItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            receivedQuantity: 5,
          }),
        }),
      );
    });

    it('full receipt marks PO as RECEIVED', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        tenantId: TEST_TENANT_ID,
        status: 'SENT',
        supplierId: 'sup-1',
        locationId: 'loc-1',
        totalPaise: BigInt(5000000),
        items: [
          { id: 'poi-1', quantity: 5, receivedQuantity: 0 },
        ],
      });

      mockPrisma.goodsReceipt.create.mockResolvedValue({});
      mockPrisma.goodsReceiptItem.create.mockResolvedValue({});
      mockPrisma.purchaseOrderItem.update.mockResolvedValue({});
      mockPrisma.purchaseOrderItem.findMany.mockResolvedValue([
        { id: 'poi-1', quantity: 5, receivedQuantity: 5 },
      ]);
      mockPrisma.purchaseOrder.update.mockResolvedValue({});
      mockPrisma.purchaseOrder.findUnique.mockResolvedValue({
        id: 'po-1',
        status: 'RECEIVED',
      });

      mockPrisma.goodsReceipt.findFirst.mockResolvedValue({
        id: 'gr-1',
        tenantId: TEST_TENANT_ID,
        receiptNumber: 'GR/2604/0001',
        purchaseOrderId: 'po-1',
        status: 'DRAFT',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        receivedDate: new Date(),
      });

      await service.createGoodsReceipt(TEST_TENANT_ID, TEST_USER_ID, {
        purchaseOrderId: 'po-1',
        items: [
          { poItemId: 'poi-1', productId: 'prod-1', receivedQuantity: 5, weightMg: 50000 },
        ],
      } as any);

      expect(mockPrisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'RECEIVED',
          }),
        }),
      );

      // Should publish event on full receipt
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'wholesale.purchase.completed',
        }),
      );
    });

    it('rejects receipt for cancelled PO', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        tenantId: TEST_TENANT_ID,
        status: 'CANCELLED',
        items: [],
      });

      await expect(
        service.createGoodsReceipt(TEST_TENANT_ID, TEST_USER_ID, {
          purchaseOrderId: 'po-1',
          items: [],
        } as any),
      ).rejects.toThrow('Cannot create receipt for cancelled PO');
    });

    it('rejects receipt for already fully received PO', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        tenantId: TEST_TENANT_ID,
        status: 'RECEIVED',
        items: [],
      });

      await expect(
        service.createGoodsReceipt(TEST_TENANT_ID, TEST_USER_ID, {
          purchaseOrderId: 'po-1',
          items: [],
        } as any),
      ).rejects.toThrow('PO is already fully received');
    });
  });

  // ─── Send / Cancel PO ──────────────────────────────────────────

  describe('sendPurchaseOrder', () => {
    it('only allows sending DRAFT POs', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        tenantId: TEST_TENANT_ID,
        status: 'SENT',
      });

      await expect(
        service.sendPurchaseOrder(TEST_TENANT_ID, TEST_USER_ID, 'po-1'),
      ).rejects.toThrow('Only draft purchase orders can be sent');
    });
  });

  describe('cancelPurchaseOrder', () => {
    it('cannot cancel a RECEIVED PO', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        tenantId: TEST_TENANT_ID,
        status: 'RECEIVED',
      });

      await expect(
        service.cancelPurchaseOrder(TEST_TENANT_ID, TEST_USER_ID, 'po-1', 'Changed mind'),
      ).rejects.toThrow('Cannot cancel a received purchase order');
    });

    it('cannot cancel an already CANCELLED PO', async () => {
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 'po-1',
        tenantId: TEST_TENANT_ID,
        status: 'CANCELLED',
      });

      await expect(
        service.cancelPurchaseOrder(TEST_TENANT_ID, TEST_USER_ID, 'po-1', 'Duplicate'),
      ).rejects.toThrow('Cannot cancel a cancelled purchase order');
    });
  });
});
