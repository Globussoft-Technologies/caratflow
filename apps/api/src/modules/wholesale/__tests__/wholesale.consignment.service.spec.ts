import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WholesaleConsignmentService } from '../wholesale.consignment.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('WholesaleConsignmentService (Unit)', () => {
  let service: WholesaleConsignmentService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    service = new WholesaleConsignmentService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
  });

  // ─── Outgoing Consignment ──────────────────────────────────────

  describe('createConsignmentOut', () => {
    it('creates consignment with items tracking quantities', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Dealer',
        lastName: 'One',
      });
      mockPrisma.consignmentOut.count.mockResolvedValue(0);
      mockPrisma.consignmentOut.create.mockResolvedValue({});
      mockPrisma.consignmentOutItem.create.mockResolvedValue({});

      mockPrisma.consignmentOut.findFirst.mockResolvedValue({
        id: 'co-1',
        tenantId: TEST_TENANT_ID,
        consignmentNumber: 'CO/2604/0001',
        customerId: 'cust-1',
        locationId: 'loc-1',
        status: 'DRAFT',
        totalWeightMg: BigInt(100000),
        totalValuePaise: BigInt(5000000),
        items: [
          { id: 'coi-1', productId: 'prod-1', quantity: 5, weightMg: BigInt(100000), valuePaise: BigInt(5000000), returnedQuantity: 0, soldQuantity: 0, status: 'ISSUED' },
        ],
        customer: { firstName: 'Dealer', lastName: 'One' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createConsignmentOut(TEST_TENANT_ID, TEST_USER_ID, {
        customerId: 'cust-1',
        locationId: 'loc-1',
        items: [
          { productId: 'prod-1', quantity: 5, weightMg: 100000, valuePaise: 5000000 },
        ],
      } as any);

      expect(result.status).toBe('DRAFT');
      expect(result.totalWeightMg).toBe(100000);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('issueConsignmentOut', () => {
    it('issues a DRAFT consignment', async () => {
      mockPrisma.consignmentOut.findFirst
        .mockResolvedValueOnce({
          id: 'co-1',
          tenantId: TEST_TENANT_ID,
          status: 'DRAFT',
          customerId: 'cust-1',
        })
        .mockResolvedValue({
          id: 'co-1',
          tenantId: TEST_TENANT_ID,
          status: 'ISSUED',
          issuedDate: new Date(),
          items: [],
          customer: { firstName: 'Test', lastName: 'Customer' },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      mockPrisma.consignmentOut.update.mockResolvedValue({});

      const result = await service.issueConsignmentOut(TEST_TENANT_ID, TEST_USER_ID, 'co-1');

      expect(result.status).toBe('ISSUED');
    });

    it('rejects issuing a non-DRAFT consignment', async () => {
      mockPrisma.consignmentOut.findFirst.mockResolvedValue({
        id: 'co-1',
        tenantId: TEST_TENANT_ID,
        status: 'ISSUED',
      });

      await expect(
        service.issueConsignmentOut(TEST_TENANT_ID, TEST_USER_ID, 'co-1'),
      ).rejects.toThrow('Only draft consignments can be issued');
    });
  });

  describe('returnConsignmentOutItems', () => {
    it('updates returned quantities correctly', async () => {
      mockPrisma.consignmentOut.findFirst.mockResolvedValue({
        id: 'co-1',
        tenantId: TEST_TENANT_ID,
        status: 'ISSUED',
        items: [
          { id: 'coi-1', quantity: 10, returnedQuantity: 0, soldQuantity: 0, status: 'ISSUED' },
        ],
      });
      mockPrisma.consignmentOutItem.update.mockResolvedValue({});
      mockPrisma.consignmentOutItem.findMany.mockResolvedValue([
        { quantity: 10, returnedQuantity: 3, soldQuantity: 0 },
      ]);
      mockPrisma.consignmentOut.update.mockResolvedValue({});

      mockPrisma.consignmentOut.findFirst.mockResolvedValueOnce({
        id: 'co-1',
        tenantId: TEST_TENANT_ID,
        status: 'ISSUED',
        items: [
          { id: 'coi-1', quantity: 10, returnedQuantity: 0, soldQuantity: 0, status: 'ISSUED' },
        ],
      }).mockResolvedValue({
        id: 'co-1',
        tenantId: TEST_TENANT_ID,
        consignmentNumber: 'CO/2604/0001',
        status: 'PARTIALLY_RETURNED',
        items: [
          { id: 'coi-1', quantity: 10, returnedQuantity: 3, soldQuantity: 0, status: 'ISSUED' },
        ],
        customer: { firstName: 'Test', lastName: 'Customer' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.returnConsignmentOutItems(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'co-1',
        [{ itemId: 'coi-1', returnedQuantity: 3 }],
      );

      expect(mockPrisma.consignmentOutItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            returnedQuantity: 3,
          }),
        }),
      );
    });

    it('rejects returning more than outstanding quantity', async () => {
      mockPrisma.consignmentOut.findFirst.mockResolvedValue({
        id: 'co-1',
        tenantId: TEST_TENANT_ID,
        status: 'ISSUED',
        items: [
          { id: 'coi-1', quantity: 5, returnedQuantity: 3, soldQuantity: 1, status: 'ISSUED' },
        ],
      });

      await expect(
        service.returnConsignmentOutItems(
          TEST_TENANT_ID,
          TEST_USER_ID,
          'co-1',
          [{ itemId: 'coi-1', returnedQuantity: 3 }], // 3+3+1=7 > 5
        ),
      ).rejects.toThrow('Cannot return more than outstanding quantity');
    });

    it('rejects returns from a RETURNED consignment', async () => {
      mockPrisma.consignmentOut.findFirst.mockResolvedValue({
        id: 'co-1',
        tenantId: TEST_TENANT_ID,
        status: 'RETURNED',
        items: [],
      });

      await expect(
        service.returnConsignmentOutItems(
          TEST_TENANT_ID,
          TEST_USER_ID,
          'co-1',
          [{ itemId: 'coi-1', returnedQuantity: 1 }],
        ),
      ).rejects.toThrow('Cannot return items from a RETURNED consignment');
    });

    it('rejects returns from CONVERTED_TO_SALE consignment', async () => {
      mockPrisma.consignmentOut.findFirst.mockResolvedValue({
        id: 'co-1',
        tenantId: TEST_TENANT_ID,
        status: 'CONVERTED_TO_SALE',
        items: [],
      });

      await expect(
        service.returnConsignmentOutItems(
          TEST_TENANT_ID,
          TEST_USER_ID,
          'co-1',
          [{ itemId: 'coi-1', returnedQuantity: 1 }],
        ),
      ).rejects.toThrow('Cannot return items from a CONVERTED_TO_SALE consignment');
    });
  });

  describe('convertConsignmentOutToSale', () => {
    it('converts remaining items to sale', async () => {
      mockPrisma.consignmentOut.findFirst.mockResolvedValue({
        id: 'co-1',
        tenantId: TEST_TENANT_ID,
        status: 'ISSUED',
        items: [
          { id: 'coi-1', productId: 'prod-1', quantity: 5, returnedQuantity: 0, soldQuantity: 0, status: 'ISSUED' },
        ],
      });
      mockPrisma.consignmentOutItem.update.mockResolvedValue({});
      mockPrisma.consignmentOutItem.findMany.mockResolvedValue([
        { quantity: 5, returnedQuantity: 0, soldQuantity: 5 },
      ]);
      mockPrisma.consignmentOut.update.mockResolvedValue({});

      mockPrisma.consignmentOut.findFirst.mockResolvedValueOnce({
        id: 'co-1',
        tenantId: TEST_TENANT_ID,
        status: 'ISSUED',
        items: [
          { id: 'coi-1', productId: 'prod-1', quantity: 5, returnedQuantity: 0, soldQuantity: 0, status: 'ISSUED' },
        ],
      }).mockResolvedValue({
        id: 'co-1',
        tenantId: TEST_TENANT_ID,
        consignmentNumber: 'CO/2604/0001',
        status: 'CONVERTED_TO_SALE',
        items: [
          { id: 'coi-1', productId: 'prod-1', quantity: 5, returnedQuantity: 0, soldQuantity: 5, status: 'SOLD' },
        ],
        customer: { firstName: 'Test', lastName: 'Customer' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.convertConsignmentOutToSale(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'co-1',
        [{ itemId: 'coi-1', soldQuantity: 5 }],
      );

      expect(mockPrisma.consignmentOutItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            soldQuantity: 5,
            status: 'SOLD',
          }),
        }),
      );
    });

    it('rejects selling more than outstanding', async () => {
      mockPrisma.consignmentOut.findFirst.mockResolvedValue({
        id: 'co-1',
        tenantId: TEST_TENANT_ID,
        status: 'ISSUED',
        items: [
          { id: 'coi-1', quantity: 5, returnedQuantity: 3, soldQuantity: 0, status: 'ISSUED' },
        ],
      });

      await expect(
        service.convertConsignmentOutToSale(
          TEST_TENANT_ID,
          TEST_USER_ID,
          'co-1',
          [{ itemId: 'coi-1', soldQuantity: 4 }], // 3+4=7 > 5
        ),
      ).rejects.toThrow('Cannot sell more than outstanding quantity');
    });
  });

  // ─── Incoming Consignment ──────────────────────────────────────

  describe('createConsignmentIn', () => {
    it('creates incoming consignment with RECEIVED status', async () => {
      mockPrisma.supplier.findFirst.mockResolvedValue({ id: 'sup-1', name: 'Gold Supplier' });
      mockPrisma.consignmentIn.count.mockResolvedValue(0);
      mockPrisma.consignmentIn.create.mockResolvedValue({});
      mockPrisma.consignmentInItem.create.mockResolvedValue({});

      mockPrisma.consignmentIn.findFirst.mockResolvedValue({
        id: 'ci-1',
        tenantId: TEST_TENANT_ID,
        consignmentNumber: 'CI/2604/0001',
        supplierId: 'sup-1',
        locationId: 'loc-1',
        status: 'RECEIVED',
        totalWeightMg: BigInt(50000),
        totalValuePaise: BigInt(3000000),
        items: [
          { id: 'cii-1', productId: 'prod-1', quantity: 5, weightMg: BigInt(50000), valuePaise: BigInt(3000000), returnedQuantity: 0, purchasedQuantity: 0, status: 'RECEIVED' },
        ],
        supplier: { name: 'Gold Supplier' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createConsignmentIn(TEST_TENANT_ID, TEST_USER_ID, {
        supplierId: 'sup-1',
        locationId: 'loc-1',
        items: [
          { productId: 'prod-1', quantity: 5, weightMg: 50000, valuePaise: 3000000 },
        ],
      } as any);

      expect(result.status).toBe('RECEIVED');
    });
  });

  describe('returnConsignmentInItems', () => {
    it('returns items to supplier and updates quantities', async () => {
      mockPrisma.consignmentIn.findFirst.mockResolvedValue({
        id: 'ci-1',
        tenantId: TEST_TENANT_ID,
        status: 'RECEIVED',
        items: [
          { id: 'cii-1', productId: 'prod-1', quantity: 10, returnedQuantity: 0, purchasedQuantity: 0, status: 'RECEIVED', weightMg: BigInt(50000) },
        ],
      });
      mockPrisma.consignmentInItem.update.mockResolvedValue({});
      mockPrisma.consignmentInItem.findMany.mockResolvedValue([
        { quantity: 10, returnedQuantity: 4, purchasedQuantity: 0 },
      ]);
      mockPrisma.consignmentIn.update.mockResolvedValue({});

      mockPrisma.consignmentIn.findFirst.mockResolvedValueOnce({
        id: 'ci-1',
        tenantId: TEST_TENANT_ID,
        status: 'RECEIVED',
        items: [
          { id: 'cii-1', quantity: 10, returnedQuantity: 0, purchasedQuantity: 0, status: 'RECEIVED', productId: 'prod-1', weightMg: BigInt(50000) },
        ],
      }).mockResolvedValue({
        id: 'ci-1',
        tenantId: TEST_TENANT_ID,
        consignmentNumber: 'CI/2604/0001',
        status: 'PARTIALLY_RETURNED',
        items: [],
        supplier: { name: 'Test Supplier' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.returnConsignmentInItems(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'ci-1',
        [{ itemId: 'cii-1', returnedQuantity: 4 }],
      );

      expect(mockPrisma.consignmentInItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            returnedQuantity: 4,
          }),
        }),
      );

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'wholesale.consignment.returned',
        }),
      );
    });

    it('rejects return exceeding outstanding quantity', async () => {
      mockPrisma.consignmentIn.findFirst.mockResolvedValue({
        id: 'ci-1',
        tenantId: TEST_TENANT_ID,
        status: 'RECEIVED',
        items: [
          { id: 'cii-1', quantity: 5, returnedQuantity: 3, purchasedQuantity: 1, status: 'RECEIVED' },
        ],
      });

      await expect(
        service.returnConsignmentInItems(
          TEST_TENANT_ID,
          TEST_USER_ID,
          'ci-1',
          [{ itemId: 'cii-1', returnedQuantity: 3 }], // 3+3+1=7 > 5
        ),
      ).rejects.toThrow('Cannot return more than outstanding quantity');
    });
  });

  describe('purchaseConsignmentInItems', () => {
    it('purchases consignment items and updates status', async () => {
      mockPrisma.consignmentIn.findFirst.mockResolvedValue({
        id: 'ci-1',
        tenantId: TEST_TENANT_ID,
        status: 'RECEIVED',
        items: [
          { id: 'cii-1', quantity: 5, returnedQuantity: 0, purchasedQuantity: 0, status: 'RECEIVED' },
        ],
      });
      mockPrisma.consignmentInItem.update.mockResolvedValue({});
      mockPrisma.consignmentInItem.findMany.mockResolvedValue([
        { quantity: 5, returnedQuantity: 0, purchasedQuantity: 5 },
      ]);
      mockPrisma.consignmentIn.update.mockResolvedValue({});

      mockPrisma.consignmentIn.findFirst.mockResolvedValueOnce({
        id: 'ci-1',
        tenantId: TEST_TENANT_ID,
        status: 'RECEIVED',
        items: [
          { id: 'cii-1', quantity: 5, returnedQuantity: 0, purchasedQuantity: 0, status: 'RECEIVED' },
        ],
      }).mockResolvedValue({
        id: 'ci-1',
        tenantId: TEST_TENANT_ID,
        consignmentNumber: 'CI/2604/0001',
        status: 'PURCHASED',
        items: [],
        supplier: { name: 'Test Supplier' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.purchaseConsignmentInItems(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'ci-1',
        [{ itemId: 'cii-1', purchasedQuantity: 5 }],
      );

      expect(mockPrisma.consignmentIn.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PURCHASED',
          }),
        }),
      );
    });
  });
});
