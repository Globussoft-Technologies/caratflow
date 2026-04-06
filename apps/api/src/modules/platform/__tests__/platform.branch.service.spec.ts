import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PlatformBranchService } from '../platform.branch.service';
import {
  createMockPrismaService,
  createMockEventBus,
  TEST_TENANT_ID,
  TEST_USER_ID,
  resetAllMocks,
} from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    location: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('PlatformBranchService (Unit)', () => {
  let service: PlatformBranchService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  const audit = { userId: TEST_USER_ID };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    mockEventBus = createMockEventBus();
    service = new PlatformBranchService(mockPrisma as any, mockEventBus as any);
  });

  describe('createBranch', () => {
    it('creates a branch and publishes event', async () => {
      const branch = { id: 'b-1', name: 'Main', locationType: 'SHOWROOM' };
      mockPrisma.location.create.mockResolvedValue(branch);

      const result = await service.createBranch(TEST_TENANT_ID, {
        name: 'Main',
        locationType: 'SHOWROOM',
        city: 'Mumbai',
      }, audit);

      expect(result.name).toBe('Main');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'platform.branch.created' }),
      );
    });
  });

  describe('updateBranch', () => {
    it('updates branch fields', async () => {
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'b-1' });
      mockPrisma.location.update.mockResolvedValue({ id: 'b-1', name: 'Updated' });

      const result = await service.updateBranch(TEST_TENANT_ID, 'b-1', { name: 'Updated' }, audit);
      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException for unknown branch', async () => {
      mockPrisma.location.findFirst.mockResolvedValue(null);
      await expect(
        service.updateBranch(TEST_TENANT_ID, 'bad', { name: 'X' }, audit),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateBranch', () => {
    it('deactivates a branch', async () => {
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'b-1' });
      mockPrisma.location.update.mockResolvedValue({ id: 'b-1', isActive: false });

      const result = await service.deactivateBranch(TEST_TENANT_ID, 'b-1', audit);
      expect(result.isActive).toBe(false);
    });
  });

  describe('listBranches', () => {
    it('returns active branches only by default', async () => {
      mockPrisma.location.findMany.mockResolvedValue([{ id: 'b-1', isActive: true }]);

      const result = await service.listBranches(TEST_TENANT_ID);
      expect(result).toHaveLength(1);
      expect(mockPrisma.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TEST_TENANT_ID, isActive: true } }),
      );
    });

    it('includes inactive branches when requested', async () => {
      mockPrisma.location.findMany.mockResolvedValue([]);
      await service.listBranches(TEST_TENANT_ID, true);
      expect(mockPrisma.location.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TEST_TENANT_ID } }),
      );
    });
  });

  describe('getBranchById', () => {
    it('returns branch when found', async () => {
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'b-1', name: 'Main' });
      const result = await service.getBranchById(TEST_TENANT_ID, 'b-1');
      expect(result.name).toBe('Main');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.location.findFirst.mockResolvedValue(null);
      await expect(service.getBranchById(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBranchSettings', () => {
    it('merges new settings with existing settings', async () => {
      mockPrisma.location.findFirst.mockResolvedValue({
        id: 'b-1',
        settings: { taxConfig: { gstNumber: 'OLD' } },
      });
      mockPrisma.location.update.mockResolvedValue({ id: 'b-1' });

      await service.updateBranchSettings(TEST_TENANT_ID, 'b-1', {
        workingHours: { start: '09:00', end: '18:00', daysOff: [0] },
      }, audit);

      expect(mockPrisma.location.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            settings: expect.objectContaining({
              taxConfig: { gstNumber: 'OLD' },
              workingHours: expect.any(Object),
            }),
          }),
        }),
      );
    });
  });

  describe('setUserActiveBranch', () => {
    it('updates user preferences with activeBranchId', async () => {
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'b-1' });
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'u-1', preferences: { theme: 'dark' } });
      mockPrisma.user.update.mockResolvedValue({ id: 'u-1', preferences: { theme: 'dark', activeBranchId: 'b-1' } });

      const result = await service.setUserActiveBranch(TEST_TENANT_ID, 'u-1', 'b-1');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            preferences: { theme: 'dark', activeBranchId: 'b-1' },
          }),
        }),
      );
    });

    it('throws NotFoundException if user not found', async () => {
      mockPrisma.location.findFirst.mockResolvedValue({ id: 'b-1' });
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.setUserActiveBranch(TEST_TENANT_ID, 'bad', 'b-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
