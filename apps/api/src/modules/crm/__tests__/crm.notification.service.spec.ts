import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, createMockEventBusService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { CrmNotificationService } from '../crm.notification.service';

describe('CrmNotificationService', () => {
  let service: CrmNotificationService; let prisma: ReturnType<typeof createMockPrismaService>;
  let eventBus: ReturnType<typeof createMockEventBusService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    eventBus = createMockEventBusService();
    ['notificationTemplate','notificationLog','customerOccasion'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() }; });
    service = new CrmNotificationService(prisma as never, eventBus as never);
  });

  describe('createTemplate', () => {
    it('should create notification template', async () => {
      (prisma as any).notificationTemplate.create.mockResolvedValue({ id: 't-1', name: 'Welcome', body: 'Hello {{firstName}}' });
      const r = await service.createTemplate(tenantId, userId, { name: 'Welcome', channel: 'EMAIL', body: 'Hello {{firstName}}', isActive: true } as any);
      expect(r.name).toBe('Welcome');
    });
  });

  describe('sendNotification', () => {
    it('should create log and dispatch', async () => {
      (prisma as any).notificationLog.create.mockResolvedValue({ id: 'nl-1', status: 'QUEUED' });
      (prisma as any).notificationLog.update.mockResolvedValue({ id: 'nl-1', status: 'SENT' });
      await service.sendNotification(tenantId, userId, { customerId: 'c1', channel: 'EMAIL', body: 'Test', subject: 'Hi' } as any);
      expect((prisma as any).notificationLog.create).toHaveBeenCalled();
    });
    it('should interpolate template variables', async () => {
      (prisma as any).notificationTemplate.findFirstOrThrow.mockResolvedValue({ id: 't-1', body: 'Hello {{firstName}}!', subject: 'Hi {{firstName}}' });
      (prisma as any).notificationLog.create.mockResolvedValue({ id: 'nl-1' });
      (prisma as any).notificationLog.update.mockResolvedValue({ id: 'nl-1' });
      await service.sendNotification(tenantId, userId, { customerId: 'c1', channel: 'EMAIL', templateId: 't-1', variables: { firstName: 'Rajesh' } } as any);
      expect((prisma as any).notificationLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ body: 'Hello Rajesh!' }) }));
    });
    it('should throw if body is empty and no template', async () => {
      await expect(service.sendNotification(tenantId, userId, { customerId: 'c1', channel: 'SMS' } as any)).rejects.toThrow('body is required');
    });
  });

  describe('bulkSend', () => {
    it('should send to multiple customers', async () => {
      (prisma as any).notificationTemplate.findFirstOrThrow.mockResolvedValue({ id: 't-1', body: 'Hi', subject: 'Hello' });
      (prisma as any).notificationLog.create.mockResolvedValue({ id: 'nl-1' });
      (prisma as any).notificationLog.update.mockResolvedValue({ id: 'nl-1' });
      const r = await service.bulkSend(tenantId, userId, ['c1', 'c2'], 'EMAIL', 't-1', { firstName: 'Test' });
      expect(r.queued).toBe(2);
      expect(r.failed).toBe(0);
    });
  });

  describe('getCustomerNotifications', () => {
    it('should return paginated logs', async () => {
      (prisma as any).notificationLog.findMany.mockResolvedValue([{ id: 'nl-1' }]);
      (prisma as any).notificationLog.count.mockResolvedValue(1);
      const r = await service.getCustomerNotifications(tenantId, 'c1');
      expect(r.total).toBe(1);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      (prisma as any).notificationTemplate.findFirstOrThrow.mockResolvedValue({ id: 't-1' });
      (prisma as any).notificationTemplate.delete.mockResolvedValue({});
      await service.deleteTemplate(tenantId, 't-1');
      expect((prisma as any).notificationTemplate.delete).toHaveBeenCalled();
    });
  });

  describe('listTemplates', () => {
    it('should list templates', async () => {
      (prisma as any).notificationTemplate.findMany.mockResolvedValue([{ id: 't-1' }]);
      const r = await service.listTemplates(tenantId);
      expect(r).toHaveLength(1);
    });
    it('should filter by channel', async () => {
      (prisma as any).notificationTemplate.findMany.mockResolvedValue([]);
      await service.listTemplates(tenantId, 'SMS');
      expect((prisma as any).notificationTemplate.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ channel: 'SMS' }) }));
    });
  });
});
