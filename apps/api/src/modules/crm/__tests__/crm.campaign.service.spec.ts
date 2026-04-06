import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, createMockEventBusService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { CrmCampaignService } from '../crm.campaign.service';
import { CrmNotificationService } from '../crm.notification.service';

describe('CrmCampaignService', () => {
  let service: CrmCampaignService; let prisma: ReturnType<typeof createMockPrismaService>;
  let notifService: any;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    const eb = createMockEventBusService();
    resetMocks(prisma);
    ['campaign','notificationTemplate','notificationLog','customerOccasion'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() }; });
    prisma.customer.count = vi.fn() as any;
    prisma.customer.findMany = vi.fn() as any;
    notifService = { sendNotification: vi.fn().mockResolvedValue({ id: 'nl-1' }) };
    service = new CrmCampaignService(prisma as never, notifService as any);
  });

  describe('createCampaign', () => {
    it('should create with DRAFT status when no scheduledAt', async () => {
      (prisma as any).campaign.create.mockResolvedValue({ id: 'c-1', status: 'DRAFT', tenantId });
      const r = await service.createCampaign(tenantId, userId, { name: 'Test', channel: 'EMAIL' } as any);
      expect(r.status).toBe('DRAFT');
    });
    it('should create with SCHEDULED status when scheduledAt provided', async () => {
      (prisma as any).campaign.create.mockResolvedValue({ id: 'c-1', status: 'SCHEDULED' });
      const r = await service.createCampaign(tenantId, userId, { name: 'Test', channel: 'EMAIL', scheduledAt: new Date() } as any);
      expect(r.status).toBe('SCHEDULED');
    });
  });

  describe('previewAudience', () => {
    it('should return count and sample customers', async () => {
      prisma.customer.count.mockResolvedValue(50);
      prisma.customer.findMany.mockResolvedValue([{ id: 'c1', firstName: 'Test', lastName: 'User', phone: '123', email: 'a@b.com', city: 'Mumbai' }] as any);
      const r = await service.previewAudience(tenantId, { customerType: ['RETAIL'] });
      expect(r.count).toBe(50);
      expect(r.samples).toHaveLength(1);
    });
  });

  describe('executeCampaign', () => {
    it('should send notifications and track metrics', async () => {
      (prisma as any).campaign.findFirstOrThrow.mockResolvedValue({ id: 'c-1', templateId: 't-1', audienceFilter: {}, channel: 'EMAIL' });
      prisma.customer.findMany.mockResolvedValue([{ id: 'c1', firstName: 'A', lastName: 'B' }] as any);
      (prisma as any).campaign.update.mockResolvedValue({ id: 'c-1' });
      const r = await service.executeCampaign(tenantId, userId, 'c-1');
      expect(r.totalRecipients).toBe(1);
      expect(r.sentCount).toBe(1);
    });
    it('should throw if no template', async () => {
      (prisma as any).campaign.findFirstOrThrow.mockResolvedValue({ id: 'c-1', templateId: null, audienceFilter: {} });
      await expect(service.executeCampaign(tenantId, userId, 'c-1')).rejects.toThrow('Campaign must have a template');
    });
    it('should track failed sends', async () => {
      (prisma as any).campaign.findFirstOrThrow.mockResolvedValue({ id: 'c-1', templateId: 't-1', audienceFilter: {}, channel: 'SMS' });
      prisma.customer.findMany.mockResolvedValue([{ id: 'c1', firstName: 'A', lastName: 'B' }, { id: 'c2', firstName: 'C', lastName: 'D' }] as any);
      notifService.sendNotification.mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce({});
      (prisma as any).campaign.update.mockResolvedValue({});
      const r = await service.executeCampaign(tenantId, userId, 'c-1');
      expect(r.sentCount).toBe(1);
      expect(r.failedCount).toBe(1);
    });
  });

  describe('pauseCampaign', () => {
    it('should pause active campaign', async () => {
      (prisma as any).campaign.findFirstOrThrow.mockResolvedValue({ id: 'c-1', status: 'ACTIVE' });
      (prisma as any).campaign.update.mockResolvedValue({ id: 'c-1', status: 'PAUSED' });
      const r = await service.pauseCampaign(tenantId, userId, 'c-1');
      expect(r.status).toBe('PAUSED');
    });
  });

  describe('cancelCampaign', () => {
    it('should cancel campaign', async () => {
      (prisma as any).campaign.findFirstOrThrow.mockResolvedValue({ id: 'c-1', status: 'DRAFT' });
      (prisma as any).campaign.update.mockResolvedValue({ id: 'c-1', status: 'CANCELLED' });
      const r = await service.cancelCampaign(tenantId, userId, 'c-1');
      expect(r.status).toBe('CANCELLED');
    });
  });

  describe('listCampaigns', () => {
    it('should return paginated campaigns', async () => {
      (prisma as any).campaign.findMany.mockResolvedValue([{ id: 'c-1' }]);
      (prisma as any).campaign.count.mockResolvedValue(1);
      const r = await service.listCampaigns(tenantId, 1, 20);
      expect(r.total).toBe(1);
    });
  });
});
