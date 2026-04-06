import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformAuditService } from '../platform.audit.service';
import {
  createMockPrismaService,
  TEST_TENANT_ID,
  TEST_USER_ID,
} from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    auditLog: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    activityLog: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
  };
}

describe('PlatformAuditService (Unit)', () => {
  let service: PlatformAuditService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  const audit = { userId: TEST_USER_ID, ipAddress: '127.0.0.1', userAgent: 'test' };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new PlatformAuditService(mockPrisma as any);
  });

  describe('logDataChange', () => {
    it('creates an audit log entry with old and new values', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'al-1' });

      await service.logDataChange(TEST_TENANT_ID, {
        action: 'UPDATE',
        entityType: 'product',
        entityId: 'p-1',
        oldValues: { name: 'Old' },
        newValues: { name: 'New' },
      }, audit);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'UPDATE',
            entityType: 'product',
            oldValues: { name: 'Old' },
            newValues: { name: 'New' },
            ipAddress: '127.0.0.1',
          }),
        }),
      );
    });

    it('stores null for missing old/new values', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'al-1' });

      await service.logDataChange(TEST_TENANT_ID, {
        action: 'CREATE',
        entityType: 'customer',
        entityId: 'c-1',
      }, audit);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            oldValues: null,
            newValues: null,
          }),
        }),
      );
    });
  });

  describe('queryAuditLogs', () => {
    it('returns paginated audit logs', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([{ id: 'al-1' }]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.queryAuditLogs(TEST_TENANT_ID, { page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filters by entityType and userId', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.queryAuditLogs(TEST_TENANT_ID, {
        page: 1,
        limit: 10,
        entityType: 'product',
        userId: 'u-1',
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'product',
            userId: 'u-1',
          }),
        }),
      );
    });

    it('filters by date range', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      await service.queryAuditLogs(TEST_TENANT_ID, {
        page: 1,
        limit: 10,
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      });

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('getAuditEntityTypes', () => {
    it('returns distinct entity types', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { entityType: 'product' },
        { entityType: 'customer' },
      ]);

      const result = await service.getAuditEntityTypes(TEST_TENANT_ID);
      expect(result).toEqual(['product', 'customer']);
    });
  });

  describe('logActivity', () => {
    it('creates an activity log entry', async () => {
      mockPrisma.activityLog.create.mockResolvedValue({ id: 'act-1' });

      await service.logActivity(TEST_TENANT_ID, {
        action: 'LOGIN',
        description: 'User logged in',
      }, audit);

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'LOGIN' }),
        }),
      );
    });
  });

  describe('queryActivityLogs', () => {
    it('returns paginated activity logs', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([{ id: 'a-1' }]);
      mockPrisma.activityLog.count.mockResolvedValue(1);

      const result = await service.queryActivityLogs(TEST_TENANT_ID, { page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
    });
  });
});
