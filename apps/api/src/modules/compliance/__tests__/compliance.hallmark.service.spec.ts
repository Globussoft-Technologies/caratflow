import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceHallmarkService } from '../compliance.hallmark.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ComplianceHallmarkService (Unit)', () => {
  let service: ComplianceHallmarkService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    (mockPrisma as any).hallmarkCenter = {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    (mockPrisma as any).hallmarkSubmission = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };
    (mockPrisma as any).hallmarkSubmissionItem = {
      findMany: vi.fn(),
      update: vi.fn(),
    };
    service = new ComplianceHallmarkService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
  });

  // ─── Hallmark Center CRUD ───────────────────────────────────────

  describe('createCenter', () => {
    it('creates a new hallmark center', async () => {
      (mockPrisma as any).hallmarkCenter.findFirst.mockResolvedValue(null);
      const centerData = {
        centerCode: 'HC-001',
        name: 'BIS Hallmark Center Mumbai',
        city: 'Mumbai',
        state: 'MH',
      };
      (mockPrisma as any).hallmarkCenter.create.mockResolvedValue({
        id: 'center-1',
        ...centerData,
        isActive: true,
      });

      const result = await service.createCenter(centerData as any);
      expect(result.centerCode).toBe('HC-001');
      expect(result.isActive).toBe(true);
    });

    it('rejects duplicate center code', async () => {
      (mockPrisma as any).hallmarkCenter.findFirst.mockResolvedValue({ id: 'existing', centerCode: 'HC-001' });

      await expect(
        service.createCenter({ centerCode: 'HC-001', name: 'Test' } as any),
      ).rejects.toThrow('already exists');
    });
  });

  describe('updateCenter', () => {
    it('updates an existing center', async () => {
      (mockPrisma as any).hallmarkCenter.findUnique.mockResolvedValue({
        id: 'center-1',
        name: 'Old Name',
        isActive: true,
      });
      (mockPrisma as any).hallmarkCenter.update.mockResolvedValue({
        id: 'center-1',
        name: 'New Name',
        isActive: true,
      });

      const result = await service.updateCenter('center-1', { name: 'New Name' } as any);
      expect(result.name).toBe('New Name');
    });

    it('throws NotFoundException for missing center', async () => {
      (mockPrisma as any).hallmarkCenter.findUnique.mockResolvedValue(null);

      await expect(service.updateCenter('nonexistent', {} as any)).rejects.toThrow('not found');
    });
  });

  describe('listCenters', () => {
    it('lists only active centers by default', async () => {
      (mockPrisma as any).hallmarkCenter.findMany.mockResolvedValue([
        { id: 'c1', name: 'Center 1', isActive: true },
      ]);

      const result = await service.listCenters();
      expect(result).toHaveLength(1);
      expect((mockPrisma as any).hallmarkCenter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('lists all centers when activeOnly=false', async () => {
      (mockPrisma as any).hallmarkCenter.findMany.mockResolvedValue([]);

      await service.listCenters(false);
      expect((mockPrisma as any).hallmarkCenter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('getCenterById', () => {
    it('throws NotFoundException for missing center', async () => {
      (mockPrisma as any).hallmarkCenter.findUnique.mockResolvedValue(null);
      await expect(service.getCenterById('nonexistent')).rejects.toThrow('not found');
    });
  });

  // ─── Submission Workflow ────────────────────────────────────────

  describe('createSubmission', () => {
    it('creates a submission with batch items', async () => {
      const submissionData = {
        hallmarkCenterId: 'center-1',
        locationId: 'loc-1',
        items: [
          { productId: 'prod-1', declaredPurity: 916 },
          { productId: 'prod-2', declaredPurity: 750 },
        ],
      };

      (mockPrisma as any).hallmarkSubmission.create.mockResolvedValue({
        id: 'sub-1',
        submissionNumber: 'HM-TEST',
        totalItems: 2,
        items: [
          { id: 'item-1', productId: 'prod-1', status: 'PENDING', product: { id: 'prod-1', sku: 'S1', name: 'Ring' } },
          { id: 'item-2', productId: 'prod-2', status: 'PENDING', product: { id: 'prod-2', sku: 'S2', name: 'Chain' } },
        ],
        hallmarkCenter: { id: 'center-1', name: 'HC Mumbai' },
      });

      const result = await service.createSubmission(TEST_TENANT_ID, TEST_USER_ID, submissionData as any);

      expect(result.totalItems).toBe(2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].status).toBe('PENDING');
    });
  });

  describe('recordResults', () => {
    const mockSubmission = {
      id: 'sub-1',
      items: [
        { id: 'item-1', productId: 'prod-1', declaredPurity: 916, status: 'PENDING' },
        { id: 'item-2', productId: 'prod-2', declaredPurity: 750, status: 'PENDING' },
      ],
    };

    it('records pass/fail results per item', async () => {
      (mockPrisma as any).hallmarkSubmission.findFirst.mockResolvedValue(mockSubmission);
      (mockPrisma as any).hallmarkSubmissionItem.update.mockResolvedValue({});
      (mockPrisma as any).hallmarkSubmissionItem.findMany.mockResolvedValue([
        { id: 'item-1', status: 'PASSED' },
        { id: 'item-2', status: 'FAILED' },
      ]);
      (mockPrisma as any).hallmarkSubmission.update.mockResolvedValue({
        id: 'sub-1',
        status: 'PARTIAL_REJECT',
        passedItems: 1,
        failedItems: 1,
        items: [],
        hallmarkCenter: {},
      });

      const result = await service.recordResults(TEST_TENANT_ID, TEST_USER_ID, {
        submissionId: 'sub-1',
        results: [
          { itemId: 'item-1', status: 'PASSED', testedPurity: 916, huidAssigned: 'XYZ789' },
          { itemId: 'item-2', status: 'FAILED', failureReason: 'Purity below declared' },
        ],
      });

      expect(result.status).toBe('PARTIAL_REJECT');
    });

    it('publishes event when HUID is assigned on pass', async () => {
      (mockPrisma as any).hallmarkSubmission.findFirst.mockResolvedValue(mockSubmission);
      (mockPrisma as any).hallmarkSubmissionItem.update.mockResolvedValue({});
      (mockPrisma as any).hallmarkSubmissionItem.findMany.mockResolvedValue([
        { id: 'item-1', status: 'PASSED' },
        { id: 'item-2', status: 'PASSED' },
      ]);
      (mockPrisma as any).hallmarkSubmission.update.mockResolvedValue({
        id: 'sub-1',
        status: 'COMPLETED',
        items: [],
        hallmarkCenter: {},
      });

      await service.recordResults(TEST_TENANT_ID, TEST_USER_ID, {
        submissionId: 'sub-1',
        results: [
          { itemId: 'item-1', status: 'PASSED', huidAssigned: 'AAA111' },
          { itemId: 'item-2', status: 'PASSED', huidAssigned: 'BBB222' },
        ],
      });

      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'compliance.hallmark.verified' }),
      );
    });

    it('sets COMPLETED status when all items pass', async () => {
      (mockPrisma as any).hallmarkSubmission.findFirst.mockResolvedValue(mockSubmission);
      (mockPrisma as any).hallmarkSubmissionItem.update.mockResolvedValue({});
      (mockPrisma as any).hallmarkSubmissionItem.findMany.mockResolvedValue([
        { id: 'item-1', status: 'PASSED' },
        { id: 'item-2', status: 'PASSED' },
      ]);
      (mockPrisma as any).hallmarkSubmission.update.mockResolvedValue({
        id: 'sub-1',
        status: 'COMPLETED',
        items: [],
        hallmarkCenter: {},
      });

      const result = await service.recordResults(TEST_TENANT_ID, TEST_USER_ID, {
        submissionId: 'sub-1',
        results: [
          { itemId: 'item-1', status: 'PASSED' },
          { itemId: 'item-2', status: 'PASSED' },
        ],
      });

      expect((mockPrisma as any).hallmarkSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });

    it('sets REJECTED status when all items fail', async () => {
      (mockPrisma as any).hallmarkSubmission.findFirst.mockResolvedValue(mockSubmission);
      (mockPrisma as any).hallmarkSubmissionItem.update.mockResolvedValue({});
      (mockPrisma as any).hallmarkSubmissionItem.findMany.mockResolvedValue([
        { id: 'item-1', status: 'FAILED' },
        { id: 'item-2', status: 'FAILED' },
      ]);
      (mockPrisma as any).hallmarkSubmission.update.mockResolvedValue({
        id: 'sub-1',
        status: 'REJECTED',
        items: [],
        hallmarkCenter: {},
      });

      await service.recordResults(TEST_TENANT_ID, TEST_USER_ID, {
        submissionId: 'sub-1',
        results: [
          { itemId: 'item-1', status: 'FAILED' },
          { itemId: 'item-2', status: 'FAILED' },
        ],
      });

      expect((mockPrisma as any).hallmarkSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'REJECTED' }),
        }),
      );
    });

    it('sets IN_PROGRESS when some items are still pending', async () => {
      (mockPrisma as any).hallmarkSubmission.findFirst.mockResolvedValue(mockSubmission);
      (mockPrisma as any).hallmarkSubmissionItem.update.mockResolvedValue({});
      (mockPrisma as any).hallmarkSubmissionItem.findMany.mockResolvedValue([
        { id: 'item-1', status: 'PASSED' },
        { id: 'item-2', status: 'PENDING' },
      ]);
      (mockPrisma as any).hallmarkSubmission.update.mockResolvedValue({
        id: 'sub-1',
        status: 'IN_PROGRESS',
        items: [],
        hallmarkCenter: {},
      });

      await service.recordResults(TEST_TENANT_ID, TEST_USER_ID, {
        submissionId: 'sub-1',
        results: [
          { itemId: 'item-1', status: 'PASSED' },
        ],
      });

      expect((mockPrisma as any).hallmarkSubmission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
    });

    it('throws NotFoundException for missing submission', async () => {
      (mockPrisma as any).hallmarkSubmission.findFirst.mockResolvedValue(null);

      await expect(
        service.recordResults(TEST_TENANT_ID, TEST_USER_ID, {
          submissionId: 'nonexistent',
          results: [],
        }),
      ).rejects.toThrow('not found');
    });
  });

  // ─── getPendingCount ────────────────────────────────────────────

  describe('getPendingCount', () => {
    it('returns count of pending submissions', async () => {
      (mockPrisma as any).hallmarkSubmission.count.mockResolvedValue(5);

      const result = await service.getPendingCount(TEST_TENANT_ID);
      expect(result).toBe(5);
    });
  });
});
