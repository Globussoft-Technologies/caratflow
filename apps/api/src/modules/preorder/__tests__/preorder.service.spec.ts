import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PreOrderService } from '../preorder.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('PreOrderService', () => {
  let service: PreOrderService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  const CUSTOMER_ID = 'cust-1';
  const PRODUCT_ID = 'prod-1';
  const PREORDER_ID = 'po-1';

  const makePreOrder = (overrides: Record<string, unknown> = {}) => ({
    id: PREORDER_ID,
    tenantId: TEST_TENANT_ID,
    customerId: CUSTOMER_ID,
    productId: PRODUCT_ID,
    quantity: 1,
    status: 'PENDING',
    orderType: 'PRE_ORDER',
    depositPaise: BigInt(500000),
    estimatedAvailableDate: new Date('2025-08-01'),
    estimatedDeliveryDate: new Date('2025-08-08'),
    actualAvailableDate: null,
    notifiedAt: null,
    fulfilledOrderId: null,
    cancelReason: null,
    notes: null,
    priceLockPaise: null,
    isPriceLocked: false,
    createdBy: TEST_USER_ID,
    updatedBy: TEST_USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: { firstName: 'John', lastName: 'Doe' },
    product: { name: 'Gold Necklace' },
    ...overrides,
  });

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();

    (mockPrisma as any).preOrder = {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { depositPaise: BigInt(0) } }),
    };
    (mockPrisma as any).preOrderConfig = {
      findUnique: vi.fn(),
    };
    (mockPrisma as any).product = {
      findFirst: vi.fn().mockResolvedValue({
        id: PRODUCT_ID,
        name: 'Gold Necklace',
        sellingPricePaise: BigInt(10000000), // Rs 1 lakh
      }),
    };
    (mockPrisma as any).stockItem = {
      aggregate: vi.fn().mockResolvedValue({
        _sum: { quantityOnHand: 0, quantityReserved: 0 },
      }),
    };

    service = new PreOrderService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
  });

  // ─── createPreOrder ────────────────────────────────────────

  describe('createPreOrder', () => {
    it('creates pre-order with deposit calculation', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue({
        id: PRODUCT_ID, name: 'Gold Necklace',
        sellingPricePaise: BigInt(10000000),
      });
      (mockPrisma as any).preOrderConfig.findUnique.mockResolvedValue({
        tenantId: TEST_TENANT_ID,
        productId: PRODUCT_ID,
        isPreOrderEnabled: true,
        isBackorderEnabled: false,
        depositPercentage: 20,
        estimatedLeadDays: 14,
        maxPreOrderQty: 10,
        autoConfirm: false,
      });
      (mockPrisma as any).preOrder.count.mockResolvedValue(0);
      (mockPrisma as any).preOrder.create.mockResolvedValue({ id: PREORDER_ID });
      (mockPrisma as any).preOrder.findFirst.mockResolvedValue(makePreOrder({
        depositPaise: BigInt(2000000), // 20% of Rs 1 lakh
      }));

      const result = await service.createPreOrder(TEST_TENANT_ID, TEST_USER_ID, {
        customerId: CUSTOMER_ID,
        productId: PRODUCT_ID,
        quantity: 1,
      } as any);

      expect(result.depositPaise).toBe(2000000);
      expect(result.status).toBe('PENDING');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'preorder.created' }),
      );
    });

    it('auto-confirms when autoConfirm is enabled', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue({
        id: PRODUCT_ID, sellingPricePaise: BigInt(10000000),
      });
      (mockPrisma as any).preOrderConfig.findUnique.mockResolvedValue({
        isPreOrderEnabled: true,
        depositPercentage: 0,
        estimatedLeadDays: 7,
        maxPreOrderQty: 0,
        autoConfirm: true,
      });
      (mockPrisma as any).preOrder.create.mockResolvedValue({ id: PREORDER_ID });
      (mockPrisma as any).preOrder.findFirst.mockResolvedValue(makePreOrder({
        status: 'CONFIRMED',
        depositPaise: BigInt(0),
      }));

      const result = await service.createPreOrder(TEST_TENANT_ID, TEST_USER_ID, {
        customerId: CUSTOMER_ID, productId: PRODUCT_ID, quantity: 1,
      } as any);

      expect(result.status).toBe('CONFIRMED');
    });

    it('rejects when pre-order not enabled', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue({ id: PRODUCT_ID });
      (mockPrisma as any).preOrderConfig.findUnique.mockResolvedValue({
        isPreOrderEnabled: false,
      });

      await expect(
        service.createPreOrder(TEST_TENANT_ID, TEST_USER_ID, {
          customerId: CUSTOMER_ID, productId: PRODUCT_ID, quantity: 1,
        } as any),
      ).rejects.toThrow('Pre-orders are not enabled');
    });

    it('rejects when max pre-order quantity exceeded', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue({
        id: PRODUCT_ID, sellingPricePaise: BigInt(10000000),
      });
      (mockPrisma as any).preOrderConfig.findUnique.mockResolvedValue({
        isPreOrderEnabled: true,
        depositPercentage: 0,
        estimatedLeadDays: 14,
        maxPreOrderQty: 5,
        autoConfirm: false,
      });
      (mockPrisma as any).preOrder.count.mockResolvedValue(5);

      await expect(
        service.createPreOrder(TEST_TENANT_ID, TEST_USER_ID, {
          customerId: CUSTOMER_ID, productId: PRODUCT_ID, quantity: 1,
        } as any),
      ).rejects.toThrow('Maximum pre-order quantity');
    });
  });

  // ─── Status Transitions ────────────────────────────────────

  describe('status transitions', () => {
    it('confirms a PENDING pre-order', async () => {
      (mockPrisma as any).preOrder.findFirst
        .mockResolvedValueOnce(makePreOrder({ status: 'PENDING' }))
        .mockResolvedValue(makePreOrder({ status: 'CONFIRMED' }));

      const result = await service.confirmPreOrder(TEST_TENANT_ID, TEST_USER_ID, PREORDER_ID);
      expect(result.status).toBe('CONFIRMED');
    });

    it('rejects confirming a non-PENDING pre-order', async () => {
      (mockPrisma as any).preOrder.findFirst.mockResolvedValue(
        makePreOrder({ status: 'CONFIRMED' }),
      );

      await expect(
        service.confirmPreOrder(TEST_TENANT_ID, TEST_USER_ID, PREORDER_ID),
      ).rejects.toThrow('Cannot confirm pre-order in CONFIRMED status');
    });

    it('marks CONFIRMED as AVAILABLE', async () => {
      (mockPrisma as any).preOrder.findFirst
        .mockResolvedValueOnce(makePreOrder({ status: 'CONFIRMED' }))
        .mockResolvedValue(makePreOrder({ status: 'AVAILABLE' }));

      const result = await service.markAvailable(TEST_TENANT_ID, TEST_USER_ID, PREORDER_ID);
      expect(result.status).toBe('AVAILABLE');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'preorder.available' }),
      );
    });

    it('rejects marking PENDING as AVAILABLE', async () => {
      (mockPrisma as any).preOrder.findFirst.mockResolvedValue(
        makePreOrder({ status: 'PENDING' }),
      );

      await expect(
        service.markAvailable(TEST_TENANT_ID, TEST_USER_ID, PREORDER_ID),
      ).rejects.toThrow('Cannot mark available');
    });
  });

  // ─── fulfillPreOrder ───────────────────────────────────────

  describe('fulfillPreOrder', () => {
    it('fulfills an AVAILABLE pre-order and creates actual order ref', async () => {
      (mockPrisma as any).preOrder.findFirst
        .mockResolvedValueOnce(makePreOrder({ status: 'AVAILABLE' }))
        .mockResolvedValue(makePreOrder({
          status: 'FULFILLED',
          fulfilledOrderId: 'order-1',
        }));

      const result = await service.fulfillPreOrder(
        TEST_TENANT_ID, TEST_USER_ID, PREORDER_ID, 'order-1',
      );

      expect(result.status).toBe('FULFILLED');
      expect(result.fulfilledOrderId).toBe('order-1');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'preorder.fulfilled' }),
      );
    });

    it('rejects fulfilling a non-AVAILABLE pre-order', async () => {
      (mockPrisma as any).preOrder.findFirst.mockResolvedValue(
        makePreOrder({ status: 'CONFIRMED' }),
      );

      await expect(
        service.fulfillPreOrder(TEST_TENANT_ID, TEST_USER_ID, PREORDER_ID, 'order-1'),
      ).rejects.toThrow('Cannot fulfill pre-order');
    });
  });

  // ─── cancelPreOrder ────────────────────────────────────────

  describe('cancelPreOrder', () => {
    it('cancels a PENDING pre-order', async () => {
      (mockPrisma as any).preOrder.findFirst
        .mockResolvedValueOnce(makePreOrder({ status: 'PENDING' }))
        .mockResolvedValue(makePreOrder({
          status: 'CANCELLED',
          cancelReason: 'Customer request',
        }));

      const result = await service.cancelPreOrder(
        TEST_TENANT_ID, TEST_USER_ID, PREORDER_ID, 'Customer request',
      );

      expect(result.status).toBe('CANCELLED');
      expect(result.cancelReason).toBe('Customer request');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'preorder.cancelled' }),
      );
    });

    it('rejects cancelling a FULFILLED pre-order', async () => {
      (mockPrisma as any).preOrder.findFirst.mockResolvedValue(
        makePreOrder({ status: 'FULFILLED' }),
      );

      await expect(
        service.cancelPreOrder(TEST_TENANT_ID, TEST_USER_ID, PREORDER_ID, 'reason'),
      ).rejects.toThrow('Cannot cancel a fulfilled pre-order');
    });

    it('rejects cancelling an already CANCELLED pre-order', async () => {
      (mockPrisma as any).preOrder.findFirst.mockResolvedValue(
        makePreOrder({ status: 'CANCELLED' }),
      );

      await expect(
        service.cancelPreOrder(TEST_TENANT_ID, TEST_USER_ID, PREORDER_ID, 'reason'),
      ).rejects.toThrow('already cancelled');
    });
  });
});
