import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PlatformNotificationService } from '../platform.notification.service';
import {
  createMockPrismaService,
  TEST_TENANT_ID,
  TEST_USER_ID,
} from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    notification: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  };
}

describe('PlatformNotificationService (Unit)', () => {
  let service: PlatformNotificationService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new PlatformNotificationService(mockPrisma as any);
  });

  describe('createNotification', () => {
    it('creates a notification with default INFO type', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n-1',
        type: 'INFO',
        isRead: false,
      });

      const result = await service.createNotification(TEST_TENANT_ID, {
        userId: TEST_USER_ID,
        title: 'Test',
        message: 'Test message',
      });

      expect(result.type).toBe('INFO');
      expect(result.isRead).toBe(false);
    });

    it('creates notification with specified type', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'n-1',
        type: 'WARNING',
      });

      const result = await service.createNotification(TEST_TENANT_ID, {
        userId: TEST_USER_ID,
        title: 'Warning',
        message: 'Low stock',
        type: 'WARNING',
      });

      expect(result.type).toBe('WARNING');
    });
  });

  describe('getUnreadCount', () => {
    it('returns the number of unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(TEST_TENANT_ID, TEST_USER_ID);
      expect(result).toBe(5);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TEST_TENANT_ID, userId: TEST_USER_ID, isRead: false },
        }),
      );
    });
  });

  describe('markAsRead', () => {
    it('marks a notification as read', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 'n-1',
        isRead: false,
      });
      mockPrisma.notification.update.mockResolvedValue({ id: 'n-1', isRead: true });

      const result = await service.markAsRead(TEST_TENANT_ID, 'n-1', TEST_USER_ID);
      expect(result.isRead).toBe(true);
    });

    it('returns existing notification if already read', async () => {
      const existing = { id: 'n-1', isRead: true };
      mockPrisma.notification.findFirst.mockResolvedValue(existing);

      const result = await service.markAsRead(TEST_TENANT_ID, 'n-1', TEST_USER_ID);
      expect(result).toBe(existing);
      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for missing notification', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      await expect(
        service.markAsRead(TEST_TENANT_ID, 'bad', TEST_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead(TEST_TENANT_ID, TEST_USER_ID);
      expect(result.markedCount).toBe(3);
    });
  });

  describe('getUserNotifications', () => {
    it('returns paginated notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([{ id: 'n-1' }]);
      mockPrisma.notification.count.mockResolvedValue(10);

      const result = await service.getUserNotifications(TEST_TENANT_ID, TEST_USER_ID, 1, 5);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(10);
    });

    it('filters unread only when requested', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.getUserNotifications(TEST_TENANT_ID, TEST_USER_ID, 1, 20, true);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: false }),
        }),
      );
    });
  });

  describe('deleteNotification', () => {
    it('deletes a notification', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({ id: 'n-1' });
      mockPrisma.notification.delete.mockResolvedValue({});

      const result = await service.deleteNotification(TEST_TENANT_ID, 'n-1', TEST_USER_ID);
      expect(result.success).toBe(true);
    });

    it('throws NotFoundException if not found', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      await expect(
        service.deleteNotification(TEST_TENANT_ID, 'bad', TEST_USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
