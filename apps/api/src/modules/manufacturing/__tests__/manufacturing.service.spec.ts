import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManufacturingService } from '../manufacturing.service';
import { MfgJobOrderStatus, JOB_ORDER_TRANSITIONS, JobCostType } from '@caratflow/shared-types';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ManufacturingService (Unit)', () => {
  let service: ManufacturingService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    service = new ManufacturingService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
  });

  // ─── BOM ──────────────────────────────────────────────────────

  describe('createBom', () => {
    it('creates BOM with nested items (metal, stone, labor, overhead)', async () => {
      const bomInput = {
        name: '22K Gold Ring',
        version: 1,
        productId: 'prod-1',
        outputQuantity: 1,
        estimatedCostPaise: 7000000,
        estimatedTimeMins: 120,
        items: [
          { itemType: 'METAL', description: '22K Gold', quantityRequired: 1, unitOfMeasure: 'g', weightMg: 10000, estimatedCostPaise: 6000000, wastagePercent: 200, sortOrder: 1 },
          { itemType: 'STONE', description: 'Diamond', quantityRequired: 2, unitOfMeasure: 'pcs', weightMg: 200, estimatedCostPaise: 500000, wastagePercent: 0, sortOrder: 2 },
          { itemType: 'LABOR', description: 'Setting Labor', quantityRequired: 1, unitOfMeasure: 'hrs', estimatedCostPaise: 300000, wastagePercent: 0, sortOrder: 3 },
          { itemType: 'OVERHEAD', description: 'Workshop Overhead', quantityRequired: 1, unitOfMeasure: 'unit', estimatedCostPaise: 200000, wastagePercent: 0, sortOrder: 4 },
        ],
      };

      mockPrisma.billOfMaterials.create.mockResolvedValue({
        id: 'bom-1',
        ...bomInput,
        tenantId: TEST_TENANT_ID,
        status: 'DRAFT',
        items: bomInput.items.map((i, idx) => ({ ...i, id: `item-${idx}` })),
        product: { name: 'Gold Ring' },
      });

      const result = await service.createBom(TEST_TENANT_ID, TEST_USER_ID, bomInput as any);

      expect(result).toBeDefined();
      expect(mockPrisma.billOfMaterials.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            name: '22K Gold Ring',
          }),
        }),
      );
    });
  });

  describe('explodeBom', () => {
    const mockBom = {
      id: 'bom-1',
      tenantId: TEST_TENANT_ID,
      name: '22K Gold Ring BOM',
      estimatedCostPaise: BigInt(7000000),
      items: [
        {
          id: 'item-1',
          productId: 'gold-22k',
          description: '22K Gold',
          itemType: 'METAL',
          quantityRequired: 1,
          unitOfMeasure: 'g',
          weightMg: BigInt(10000),
          estimatedCostPaise: BigInt(6000000),
          wastagePercent: 200,
          sortOrder: 1,
          product: { name: '22K Gold' },
        },
        {
          id: 'item-2',
          productId: 'diamond-1ct',
          description: 'Diamond 1ct',
          itemType: 'STONE',
          quantityRequired: 2,
          unitOfMeasure: 'pcs',
          weightMg: BigInt(200),
          estimatedCostPaise: BigInt(500000),
          wastagePercent: 0,
          sortOrder: 2,
          product: { name: 'Diamond 1ct' },
        },
      ],
      product: { name: 'Diamond Gold Ring' },
    };

    it('flattens BOM with wastage calculation', async () => {
      mockPrisma.billOfMaterials.findFirst.mockResolvedValue(mockBom);

      const result = await service.explodeBom(TEST_TENANT_ID, 'bom-1', 1);

      const goldItem = result.items.find((i) => i.description === '22K Gold');
      expect(goldItem!.requiredWeightMg).toBe(BigInt(10000));
      // Wastage: 10000 * 200 / 10000 = 200
      expect(goldItem!.totalWithWastageMg).toBe(BigInt(10200));
    });

    it('multiplies quantities at each level', async () => {
      mockPrisma.billOfMaterials.findFirst.mockResolvedValue(mockBom);

      const result = await service.explodeBom(TEST_TENANT_ID, 'bom-1', 5);

      const goldItem = result.items.find((i) => i.description === '22K Gold');
      expect(goldItem!.requiredWeightMg).toBe(BigInt(50000)); // 10000 * 5
      expect(goldItem!.requiredQuantity).toBe(5); // 1 * 5
      // Wastage: 50000 * 200 / 10000 = 1000
      expect(goldItem!.totalWithWastageMg).toBe(BigInt(51000));

      const diamondItem = result.items.find((i) => i.description === 'Diamond 1ct');
      expect(diamondItem!.requiredQuantity).toBe(10); // 2 * 5
    });

    it('calculates total estimated cost scaled by quantity', async () => {
      mockPrisma.billOfMaterials.findFirst.mockResolvedValue(mockBom);

      const result = await service.explodeBom(TEST_TENANT_ID, 'bom-1', 3);

      expect(result.totalEstimatedCostPaise).toBe(BigInt(21000000)); // 7000000 * 3
    });

    it('throws when BOM not found', async () => {
      mockPrisma.billOfMaterials.findFirst.mockResolvedValue(null);

      await expect(
        service.explodeBom(TEST_TENANT_ID, 'nonexistent', 1),
      ).rejects.toThrow('BOM not found');
    });
  });

  describe('cloneBom', () => {
    it('creates new version with incremented version number', async () => {
      mockPrisma.billOfMaterials.findFirst.mockResolvedValue({
        id: 'bom-1',
        tenantId: TEST_TENANT_ID,
        name: 'Gold Ring BOM',
        version: 2,
        productId: 'prod-1',
        outputQuantity: 1,
        status: 'ACTIVE',
        notes: 'Original',
        estimatedCostPaise: BigInt(5000000),
        estimatedTimeMins: 60,
        items: [
          {
            id: 'item-1',
            itemType: 'METAL',
            productId: 'gold-22k',
            description: '22K Gold',
            quantityRequired: 1,
            unitOfMeasure: 'g',
            weightMg: BigInt(10000),
            estimatedCostPaise: BigInt(5000000),
            wastagePercent: 200,
            sortOrder: 1,
          },
        ],
      });

      mockPrisma.billOfMaterials.create.mockResolvedValue({
        id: 'bom-2',
        name: 'Gold Ring BOM (Copy)',
        version: 3,
        status: 'DRAFT',
        items: [],
        product: {},
      });

      const result = await service.cloneBom(TEST_TENANT_ID, TEST_USER_ID, 'bom-1');

      expect(mockPrisma.billOfMaterials.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Gold Ring BOM (Copy)',
            version: 3,
            status: 'DRAFT',
          }),
        }),
      );
    });
  });

  // ─── Job Orders ───────────────────────────────────────────────

  describe('createJobOrder', () => {
    it('generates job number and creates order', async () => {
      mockPrisma.jobOrder.count.mockResolvedValue(5);
      mockPrisma.jobOrder.create.mockResolvedValue({
        id: 'job-1',
        tenantId: TEST_TENANT_ID,
        jobNumber: 'JO-000006',
        status: 'DRAFT',
        productId: 'prod-1',
        product: { productType: 'JEWELRY', name: 'Ring' },
        customer: null,
        location: {},
        assignedKarigar: null,
        items: [],
        costs: [],
      });
      mockPrisma.jobOrder.findFirst.mockResolvedValue({
        id: 'job-1',
        jobNumber: 'JO-000006',
        status: 'DRAFT',
        product: {},
        customer: null,
        location: {},
        assignedKarigar: null,
        bom: null,
        items: [],
        costs: [],
        qualityCheckpoints: [],
        karigarTransactions: [],
      });

      const result = await service.createJobOrder(TEST_TENANT_ID, TEST_USER_ID, {
        productId: 'prod-1',
        locationId: 'loc-1',
        priority: 'HIGH',
        quantity: 1,
      } as any);

      expect(result).toBeDefined();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'manufacturing.job.created',
        }),
      );
    });

    it('creates job order items from BOM when bomId specified', async () => {
      mockPrisma.jobOrder.count.mockResolvedValue(0);
      mockPrisma.jobOrder.create.mockResolvedValue({
        id: 'job-1',
        status: 'DRAFT',
        productId: 'prod-1',
        product: { productType: 'JEWELRY', name: 'Ring' },
        customer: null,
        location: {},
        assignedKarigar: null,
        items: [],
        costs: [],
      });

      // For findBomById (called within createJobOrder)
      mockPrisma.billOfMaterials.findFirst.mockResolvedValue({
        id: 'bom-1',
        name: 'Ring BOM',
        items: [
          { id: 'bi-1', productId: 'gold-22k', description: 'Gold', weightMg: BigInt(5000), estimatedCostPaise: BigInt(3000000), product: null },
        ],
        product: { name: 'Ring' },
      });

      mockPrisma.jobOrderItem.createMany.mockResolvedValue({ count: 1 });

      mockPrisma.jobOrder.findFirst.mockResolvedValue({
        id: 'job-1',
        product: {},
        customer: null,
        location: {},
        assignedKarigar: null,
        bom: { items: [] },
        items: [],
        costs: [],
        qualityCheckpoints: [],
        karigarTransactions: [],
      });

      await service.createJobOrder(TEST_TENANT_ID, TEST_USER_ID, {
        productId: 'prod-1',
        locationId: 'loc-1',
        priority: 'MEDIUM',
        quantity: 2,
        bomId: 'bom-1',
      } as any);

      expect(mockPrisma.jobOrderItem.createMany).toHaveBeenCalled();
    });
  });

  describe('updateJobOrderStatus', () => {
    const createMockJob = (status: MfgJobOrderStatus) => ({
      id: 'job-1',
      tenantId: TEST_TENANT_ID,
      status,
      productId: 'prod-1',
      actualStartDate: null,
      actualEndDate: null,
    });

    const setupTransition = (fromStatus: MfgJobOrderStatus, toStatus: MfgJobOrderStatus) => {
      mockPrisma.jobOrder.findFirst
        .mockResolvedValueOnce(createMockJob(fromStatus))
        .mockResolvedValue({
          ...createMockJob(toStatus),
          product: {},
          customer: null,
          location: {},
          assignedKarigar: null,
          bom: null,
          items: [],
          costs: [],
          qualityCheckpoints: [],
          karigarTransactions: [],
        });
      mockPrisma.jobOrder.update.mockResolvedValue({
        ...createMockJob(toStatus),
        product: { productType: 'JEWELRY' },
      });
    };

    // Test all valid transitions
    const validTransitions: [MfgJobOrderStatus, MfgJobOrderStatus][] = [
      [MfgJobOrderStatus.DRAFT, MfgJobOrderStatus.PLANNED],
      [MfgJobOrderStatus.DRAFT, MfgJobOrderStatus.CANCELLED],
      [MfgJobOrderStatus.PLANNED, MfgJobOrderStatus.MATERIAL_ISSUED],
      [MfgJobOrderStatus.PLANNED, MfgJobOrderStatus.CANCELLED],
      [MfgJobOrderStatus.MATERIAL_ISSUED, MfgJobOrderStatus.IN_PROGRESS],
      [MfgJobOrderStatus.MATERIAL_ISSUED, MfgJobOrderStatus.CANCELLED],
      [MfgJobOrderStatus.IN_PROGRESS, MfgJobOrderStatus.QC_PENDING],
      [MfgJobOrderStatus.IN_PROGRESS, MfgJobOrderStatus.CANCELLED],
      [MfgJobOrderStatus.QC_PENDING, MfgJobOrderStatus.QC_PASSED],
      [MfgJobOrderStatus.QC_PENDING, MfgJobOrderStatus.QC_FAILED],
      [MfgJobOrderStatus.QC_PASSED, MfgJobOrderStatus.COMPLETED],
      [MfgJobOrderStatus.QC_FAILED, MfgJobOrderStatus.IN_PROGRESS],
      [MfgJobOrderStatus.QC_FAILED, MfgJobOrderStatus.CANCELLED],
    ];

    for (const [from, to] of validTransitions) {
      it(`allows valid transition: ${from} -> ${to}`, async () => {
        setupTransition(from, to);

        const result = await service.updateJobOrderStatus(
          TEST_TENANT_ID,
          TEST_USER_ID,
          'job-1',
          { status: to },
        );

        expect(result).toBeDefined();
      });
    }

    // Test invalid transitions
    const invalidTransitions: [MfgJobOrderStatus, MfgJobOrderStatus][] = [
      [MfgJobOrderStatus.DRAFT, MfgJobOrderStatus.COMPLETED],
      [MfgJobOrderStatus.DRAFT, MfgJobOrderStatus.IN_PROGRESS],
      [MfgJobOrderStatus.COMPLETED, MfgJobOrderStatus.IN_PROGRESS],
      [MfgJobOrderStatus.COMPLETED, MfgJobOrderStatus.DRAFT],
      [MfgJobOrderStatus.CANCELLED, MfgJobOrderStatus.DRAFT],
      [MfgJobOrderStatus.CANCELLED, MfgJobOrderStatus.PLANNED],
      [MfgJobOrderStatus.PLANNED, MfgJobOrderStatus.COMPLETED],
    ];

    for (const [from, to] of invalidTransitions) {
      it(`rejects invalid transition: ${from} -> ${to}`, async () => {
        mockPrisma.jobOrder.findFirst.mockResolvedValue(createMockJob(from));

        await expect(
          service.updateJobOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'job-1', {
            status: to,
          }),
        ).rejects.toThrow(`Cannot transition from ${from} to ${to}`);
      });
    }

    it('sets actualStartDate when transitioning to IN_PROGRESS', async () => {
      setupTransition(MfgJobOrderStatus.MATERIAL_ISSUED, MfgJobOrderStatus.IN_PROGRESS);

      await service.updateJobOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'job-1', {
        status: MfgJobOrderStatus.IN_PROGRESS,
      });

      expect(mockPrisma.jobOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actualStartDate: expect.any(Date),
          }),
        }),
      );
    });

    it('sets actualEndDate when COMPLETED', async () => {
      setupTransition(MfgJobOrderStatus.QC_PASSED, MfgJobOrderStatus.COMPLETED);

      await service.updateJobOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'job-1', {
        status: MfgJobOrderStatus.COMPLETED,
      });

      expect(mockPrisma.jobOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actualEndDate: expect.any(Date),
          }),
        }),
      );
    });

    it('publishes event on COMPLETED', async () => {
      setupTransition(MfgJobOrderStatus.QC_PASSED, MfgJobOrderStatus.COMPLETED);

      await service.updateJobOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'job-1', {
        status: MfgJobOrderStatus.COMPLETED,
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'manufacturing.job.completed',
        }),
      );
    });

    it('throws when job order not found', async () => {
      mockPrisma.jobOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.updateJobOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent', {
          status: MfgJobOrderStatus.PLANNED,
        }),
      ).rejects.toThrow('Job order not found');
    });
  });

  // ─── Job Costing ──────────────────────────────────────────────

  describe('getJobCost', () => {
    it('sums material + labor + overhead correctly', async () => {
      mockPrisma.jobOrder.findFirst.mockResolvedValue({
        id: 'job-1',
        tenantId: TEST_TENANT_ID,
        jobNumber: 'JO-000001',
        costs: [
          { costType: 'MATERIAL_METAL', amountPaise: BigInt(5000000) },
          { costType: 'MATERIAL_STONE', amountPaise: BigInt(2000000) },
          { costType: 'LABOR', amountPaise: BigInt(300000) },
          { costType: 'OVERHEAD', amountPaise: BigInt(100000) },
        ],
        items: [{ id: 'item-1' }, { id: 'item-2' }],
      });

      const result = await service.getJobCost(TEST_TENANT_ID, 'job-1');

      expect(result.totalCostPaise).toBe(BigInt(7400000));
      expect(result.costsByType['MATERIAL_METAL']).toBe(BigInt(5000000));
      expect(result.costsByType['LABOR']).toBe(BigInt(300000));
      expect(result.itemCount).toBe(2);
      expect(result.costEntryCount).toBe(4);
    });
  });

  // ─── Material Requisition ─────────────────────────────────────

  describe('generateRequisitionFromBom', () => {
    it('generates material requisition with correct quantities from BOM', async () => {
      mockPrisma.billOfMaterials.findFirst.mockResolvedValue({
        id: 'bom-1',
        name: 'Chain BOM',
        estimatedCostPaise: BigInt(3000000),
        items: [
          {
            id: 'item-1',
            productId: 'gold-22k',
            description: '22K Gold Wire',
            itemType: 'METAL',
            quantityRequired: 1,
            unitOfMeasure: 'g',
            weightMg: BigInt(5000),
            estimatedCostPaise: BigInt(3000000),
            wastagePercent: 300, // 3%
            sortOrder: 1,
            product: { name: '22K Gold' },
          },
        ],
        product: { name: 'Gold Chain' },
      });

      const result = await service.generateRequisitionFromBom(TEST_TENANT_ID, 'bom-1', 10);

      expect(result.items).toHaveLength(1);
      const goldItem = result.items[0]!;
      expect(goldItem.requiredWeightMg).toBe(BigInt(50000)); // 5000 * 10
      // Wastage: 50000 * 300 / 10000 = 1500
      expect(goldItem.totalWithWastageMg).toBe(BigInt(51500));
      expect(goldItem.requiredQuantity).toBe(10);
    });
  });

  // ─── State Machine Completeness ──────────────────────────────

  describe('JOB_ORDER_TRANSITIONS state machine', () => {
    it('covers all MfgJobOrderStatus values', () => {
      const allStatuses = Object.values(MfgJobOrderStatus);
      for (const status of allStatuses) {
        expect(JOB_ORDER_TRANSITIONS[status]).toBeDefined();
      }
    });

    it('COMPLETED and CANCELLED are terminal states', () => {
      expect(JOB_ORDER_TRANSITIONS[MfgJobOrderStatus.COMPLETED]).toHaveLength(0);
      expect(JOB_ORDER_TRANSITIONS[MfgJobOrderStatus.CANCELLED]).toHaveLength(0);
    });

    it('happy path: DRAFT -> PLANNED -> MATERIAL_ISSUED -> IN_PROGRESS -> QC_PENDING -> QC_PASSED -> COMPLETED', () => {
      const happyPath = [
        MfgJobOrderStatus.DRAFT,
        MfgJobOrderStatus.PLANNED,
        MfgJobOrderStatus.MATERIAL_ISSUED,
        MfgJobOrderStatus.IN_PROGRESS,
        MfgJobOrderStatus.QC_PENDING,
        MfgJobOrderStatus.QC_PASSED,
        MfgJobOrderStatus.COMPLETED,
      ];

      for (let i = 0; i < happyPath.length - 1; i++) {
        expect(
          JOB_ORDER_TRANSITIONS[happyPath[i]!].includes(happyPath[i + 1]!),
          `${happyPath[i]} -> ${happyPath[i + 1]} should be allowed`,
        ).toBe(true);
      }
    });
  });
});
