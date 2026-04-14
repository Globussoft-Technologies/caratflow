import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrpcService } from '../../../trpc/trpc.service';
import { CrmTrpcRouter } from '../crm.trpc';

describe('CrmTrpcRouter (videoConsultation sub-router)', () => {
  const trpc = new TrpcService();

  const crmService = {} as never;
  const loyaltyService = {} as never;
  const notificationService = {} as never;
  const campaignService = {} as never;
  const leadService = {} as never;
  const feedbackService = {} as never;

  const videoConsultationService = {
    request: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    schedule: vi.fn(),
    start: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
    markNoShow: vi.fn(),
  };

  const ctx = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    userRole: 'customer',
    userPermissions: [],
  };

  const routerInstance = new CrmTrpcRouter(
    trpc,
    crmService,
    loyaltyService,
    notificationService,
    campaignService,
    leadService,
    feedbackService,
    videoConsultationService as never,
  );
  const caller = (routerInstance.router as never as ReturnType<typeof trpc.router>).createCaller(ctx);

  const CONSULTATION_ID = '44444444-4444-4444-4444-444444444444';
  const CUSTOMER_ID = '55555555-5555-5555-5555-555555555555';
  const CONSULTANT_ID = '66666666-6666-6666-6666-666666666666';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('videoConsultation.request', () => {
    it('delegates to service with tenantId, customerId, input', async () => {
      videoConsultationService.request.mockResolvedValue({ id: CONSULTATION_ID, status: 'REQUESTED' });

      const input = { customerId: CUSTOMER_ID, preferredLang: 'en', customerPhone: '+919876543210' };
      const result = await (caller as any).videoConsultation.request(input);

      expect(videoConsultationService.request).toHaveBeenCalledWith('tenant-1', CUSTOMER_ID, expect.objectContaining(input));
      expect(result.status).toBe('REQUESTED');
    });

    it('rejects invalid input (missing customerId)', async () => {
      await expect((caller as any).videoConsultation.request({ preferredLang: 'en' })).rejects.toThrow();
    });
  });

  describe('videoConsultation.list', () => {
    it('passes filters + pagination', async () => {
      videoConsultationService.list.mockResolvedValue({
        items: [], total: 0, page: 1, limit: 20, totalPages: 1, hasNext: false, hasPrevious: false,
      });
      await (caller as any).videoConsultation.list({ status: 'REQUESTED', page: 1, limit: 20 });
      expect(videoConsultationService.list).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({ status: 'REQUESTED' }),
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });
  });

  describe('videoConsultation.get', () => {
    it('delegates with id', async () => {
      videoConsultationService.get.mockResolvedValue({ id: CONSULTATION_ID });
      const result = await (caller as any).videoConsultation.get({ id: CONSULTATION_ID });
      expect(videoConsultationService.get).toHaveBeenCalledWith('tenant-1', CONSULTATION_ID);
      expect(result.id).toBe(CONSULTATION_ID);
    });
  });

  describe('videoConsultation.schedule', () => {
    it('delegates with id, consultantId, scheduledAt', async () => {
      videoConsultationService.schedule.mockResolvedValue({ id: CONSULTATION_ID, status: 'SCHEDULED' });
      const scheduledAt = new Date('2026-05-01T10:00:00Z');

      const result = await (caller as any).videoConsultation.schedule({
        id: CONSULTATION_ID,
        consultantId: CONSULTANT_ID,
        scheduledAt,
      });

      expect(videoConsultationService.schedule).toHaveBeenCalledWith(
        'tenant-1',
        CONSULTATION_ID,
        CONSULTANT_ID,
        expect.any(Date),
      );
      expect(result.status).toBe('SCHEDULED');
    });
  });

  describe('videoConsultation.start', () => {
    it('delegates to service.start', async () => {
      videoConsultationService.start.mockResolvedValue({ id: CONSULTATION_ID, status: 'IN_PROGRESS' });
      const result = await (caller as any).videoConsultation.start({ id: CONSULTATION_ID });
      expect(videoConsultationService.start).toHaveBeenCalledWith('tenant-1', CONSULTATION_ID);
      expect(result.status).toBe('IN_PROGRESS');
    });
  });

  describe('videoConsultation.complete', () => {
    it('delegates with optional notes', async () => {
      videoConsultationService.complete.mockResolvedValue({ id: CONSULTATION_ID, status: 'COMPLETED' });
      await (caller as any).videoConsultation.complete({ id: CONSULTATION_ID, notes: 'Good call' });
      expect(videoConsultationService.complete).toHaveBeenCalledWith('tenant-1', CONSULTATION_ID, 'Good call');
    });
  });

  describe('videoConsultation.cancel', () => {
    it('delegates with optional reason', async () => {
      videoConsultationService.cancel.mockResolvedValue({ id: CONSULTATION_ID, status: 'CANCELLED' });
      await (caller as any).videoConsultation.cancel({ id: CONSULTATION_ID, reason: 'Customer busy' });
      expect(videoConsultationService.cancel).toHaveBeenCalledWith('tenant-1', CONSULTATION_ID, 'Customer busy');
    });
  });

  describe('videoConsultation.markNoShow', () => {
    it('delegates to service.markNoShow', async () => {
      videoConsultationService.markNoShow.mockResolvedValue({ id: CONSULTATION_ID, status: 'NO_SHOW' });
      const result = await (caller as any).videoConsultation.markNoShow({ id: CONSULTATION_ID });
      expect(videoConsultationService.markNoShow).toHaveBeenCalledWith('tenant-1', CONSULTATION_ID);
      expect(result.status).toBe('NO_SHOW');
    });
  });
});
