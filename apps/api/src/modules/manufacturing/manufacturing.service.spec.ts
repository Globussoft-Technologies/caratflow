import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManufacturingService } from './manufacturing.service';
import { MfgJobOrderStatus, JOB_ORDER_TRANSITIONS } from '@caratflow/shared-types';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../__tests__/setup';

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

  // ─── BOM Explosion ───────────────────────────────────────────

  describe('explodeBom', () => {
    it('explodes a BOM into flat material list with quantities multiplied', async () => {
      mockPrisma.billOfMaterials.findFirst.mockResolvedValue({
        id: 'bom-1',
        tenantId: TEST_TENANT_ID,
        name: '22K Gold Ring BOM',
        estimatedCostPaise: BigInt(7000000), // Rs 70,000
        items: [
          {
            id: 'item-1',
            productId: 'gold-22k',
            description: '22K Gold',
            itemType: 'RAW_MATERIAL',
            quantityRequired: 1,
            unitOfMeasure: 'g',
            weightMg: BigInt(10000), // 10g
            estimatedCostPaise: BigInt(6000000),
            wastagePercent: 200, // 2%
            sortOrder: 1,
            product: { name: '22K Gold' },
          },
          {
            id: 'item-2',
            productId: 'diamond-1ct',
            description: 'Diamond 1ct',
            itemType: 'COMPONENT',
            quantityRequired: 2,
            unitOfMeasure: 'pcs',
            weightMg: BigInt(200), // 0.2g
            estimatedCostPaise: BigInt(500000),
            wastagePercent: 0,
            sortOrder: 2,
            product: { name: 'Diamond 1ct' },
          },
        ],
        product: { name: 'Diamond Gold Ring' },
      });

      const result = await service.explodeBom(TEST_TENANT_ID, 'bom-1', 5);

      expect(result.bomName).toBe('22K Gold Ring BOM');
      expect(result.quantity).toBe(5);
      expect(result.items).toHaveLength(2);

      // Gold: 10g * 5 = 50g, with 2% wastage
      const goldItem = result.items.find((i) => i.description === '22K Gold');
      expect(goldItem).toBeDefined();
      expect(goldItem!.requiredWeightMg).toBe(BigInt(50000)); // 50g in mg
      expect(goldItem!.requiredQuantity).toBe(5); // 1 * 5

      // Wastage: 50000mg * 200/10000 = 1000mg
      expect(goldItem!.totalWithWastageMg).toBe(BigInt(51000));

      // Diamond: 2 * 5 = 10 pieces needed
      const diamondItem = result.items.find((i) => i.description === 'Diamond 1ct');
      expect(diamondItem!.requiredQuantity).toBe(10);

      // Total cost: 7000000 * 5 = 35000000
      expect(result.totalEstimatedCostPaise).toBe(BigInt(35000000));
    });

    it('throws when BOM not found', async () => {
      mockPrisma.billOfMaterials.findFirst.mockResolvedValue(null);

      await expect(
        service.explodeBom(TEST_TENANT_ID, 'nonexistent', 1),
      ).rejects.toThrow('BOM not found');
    });
  });

  // ─── Job Order Status Transitions ────────────────────────────

  describe('updateJobOrderStatus', () => {
    const createMockJob = (status: MfgJobOrderStatus) => ({
      id: 'job-1',
      tenantId: TEST_TENANT_ID,
      status,
      productId: 'product-1',
      actualStartDate: null,
      actualEndDate: null,
    });

    it('allows valid transition: DRAFT -> PLANNED', async () => {
      mockPrisma.jobOrder.findFirst.mockResolvedValue(createMockJob(MfgJobOrderStatus.DRAFT));
      mockPrisma.jobOrder.update.mockResolvedValue({
        ...createMockJob(MfgJobOrderStatus.PLANNED),
        product: { productType: 'JEWELRY' },
      });
      mockPrisma.jobOrder.findFirst.mockResolvedValueOnce(createMockJob(MfgJobOrderStatus.DRAFT));
      // For findJobOrderById called at end
      mockPrisma.jobOrder.findFirst.mockResolvedValue({
        ...createMockJob(MfgJobOrderStatus.PLANNED),
        product: {},
        customer: null,
        location: {},
        assignedKarigar: null,
        items: [],
        costs: [],
      });

      const result = await service.updateJobOrderStatus(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'job-1',
        { status: MfgJobOrderStatus.PLANNED },
      );

      expect(result).toBeDefined();
    });

    it('allows valid transition: PLANNED -> MATERIAL_ISSUED', async () => {
      mockPrisma.jobOrder.findFirst.mockResolvedValueOnce(createMockJob(MfgJobOrderStatus.PLANNED));
      mockPrisma.jobOrder.update.mockResolvedValue({
        ...createMockJob(MfgJobOrderStatus.MATERIAL_ISSUED),
        product: {},
      });
      mockPrisma.jobOrder.findFirst.mockResolvedValue({
        ...createMockJob(MfgJobOrderStatus.MATERIAL_ISSUED),
        product: {},
        customer: null,
        location: {},
        assignedKarigar: null,
        items: [],
        costs: [],
      });

      const result = await service.updateJobOrderStatus(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'job-1',
        { status: MfgJobOrderStatus.MATERIAL_ISSUED },
      );

      expect(result).toBeDefined();
    });

    it('rejects invalid transition: DRAFT -> COMPLETED', async () => {
      mockPrisma.jobOrder.findFirst.mockResolvedValue(createMockJob(MfgJobOrderStatus.DRAFT));

      await expect(
        service.updateJobOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'job-1', {
          status: MfgJobOrderStatus.COMPLETED,
        }),
      ).rejects.toThrow('Cannot transition from DRAFT to COMPLETED');
    });

    it('rejects invalid transition: COMPLETED -> IN_PROGRESS', async () => {
      mockPrisma.jobOrder.findFirst.mockResolvedValue(createMockJob(MfgJobOrderStatus.COMPLETED));

      await expect(
        service.updateJobOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'job-1', {
          status: MfgJobOrderStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow('Cannot transition from COMPLETED');
    });

    it('rejects transitions from CANCELLED (terminal state)', async () => {
      mockPrisma.jobOrder.findFirst.mockResolvedValue(createMockJob(MfgJobOrderStatus.CANCELLED));

      await expect(
        service.updateJobOrderStatus(TEST_TENANT_ID, TEST_USER_ID, 'job-1', {
          status: MfgJobOrderStatus.DRAFT,
        }),
      ).rejects.toThrow('Cannot transition from CANCELLED');
    });

    it('allows QC_FAILED -> IN_PROGRESS (rework)', async () => {
      mockPrisma.jobOrder.findFirst.mockResolvedValueOnce(createMockJob(MfgJobOrderStatus.QC_FAILED));
      mockPrisma.jobOrder.update.mockResolvedValue({
        ...createMockJob(MfgJobOrderStatus.IN_PROGRESS),
        product: {},
      });
      mockPrisma.jobOrder.findFirst.mockResolvedValue({
        ...createMockJob(MfgJobOrderStatus.IN_PROGRESS),
        product: {},
        customer: null,
        location: {},
        assignedKarigar: null,
        items: [],
        costs: [],
      });

      const result = await service.updateJobOrderStatus(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'job-1',
        { status: MfgJobOrderStatus.IN_PROGRESS },
      );

      expect(result).toBeDefined();
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

  // ─── State Machine Completeness ──────────────────────────────

  describe('JOB_ORDER_TRANSITIONS state machine', () => {
    it('covers all MfgJobOrderStatus values', () => {
      const allStatuses = Object.values(MfgJobOrderStatus);
      for (const status of allStatuses) {
        expect(JOB_ORDER_TRANSITIONS[status]).toBeDefined();
      }
    });

    it('COMPLETED and CANCELLED are terminal states (no outgoing transitions)', () => {
      expect(JOB_ORDER_TRANSITIONS[MfgJobOrderStatus.COMPLETED]).toHaveLength(0);
      expect(JOB_ORDER_TRANSITIONS[MfgJobOrderStatus.CANCELLED]).toHaveLength(0);
    });

    it('every non-terminal state can be CANCELLED', () => {
      const terminalStates = [MfgJobOrderStatus.COMPLETED, MfgJobOrderStatus.CANCELLED];
      const qcStates = [MfgJobOrderStatus.QC_PENDING, MfgJobOrderStatus.QC_PASSED];
      const nonTerminal = Object.values(MfgJobOrderStatus)
        .filter((s) => !terminalStates.includes(s) && !qcStates.includes(s));

      for (const status of nonTerminal) {
        expect(
          JOB_ORDER_TRANSITIONS[status].includes(MfgJobOrderStatus.CANCELLED),
          `${status} should be cancellable`,
        ).toBe(true);
      }
    });

    it('follows the expected happy path: DRAFT -> PLANNED -> MATERIAL_ISSUED -> IN_PROGRESS -> QC_PENDING -> QC_PASSED -> COMPLETED', () => {
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
        const from = happyPath[i]!;
        const to = happyPath[i + 1]!;
        expect(
          JOB_ORDER_TRANSITIONS[from].includes(to),
          `${from} -> ${to} should be allowed`,
        ).toBe(true);
      }
    });
  });
});
