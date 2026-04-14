import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VideoConsultationService } from '../video-consultation.service';
import {
  createMockPrismaService,
  createMockEventBus,
  TEST_TENANT_ID,
  resetAllMocks,
} from '../../../__tests__/setup';

describe('VideoConsultationService (Unit)', () => {
  let service: VideoConsultationService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  const CUSTOMER_ID = '11111111-1111-1111-1111-111111111111';
  const CONSULTATION_ID = '22222222-2222-2222-2222-222222222222';
  const CONSULTANT_ID = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    service = new VideoConsultationService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
  });

  describe('request', () => {
    it('creates a consultation with REQUESTED status and publishes event', async () => {
      mockPrisma.videoConsultation.create.mockResolvedValue({
        id: CONSULTATION_ID,
        tenantId: TEST_TENANT_ID,
        customerId: CUSTOMER_ID,
        status: 'REQUESTED',
      });

      const result = await service.request(TEST_TENANT_ID, CUSTOMER_ID, {
        customerId: CUSTOMER_ID,
        preferredLang: 'en',
        customerPhone: '+919876543210',
      });

      expect(result.status).toBe('REQUESTED');
      expect(mockPrisma.videoConsultation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            customerId: CUSTOMER_ID,
            status: 'REQUESTED',
          }),
        }),
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'crm.consultation.requested' }),
      );
    });
  });

  describe('schedule', () => {
    it('transitions REQUESTED -> SCHEDULED, generates Jitsi URL, emits event', async () => {
      mockPrisma.videoConsultation.findFirst.mockResolvedValue({
        id: CONSULTATION_ID,
        tenantId: TEST_TENANT_ID,
        customerId: CUSTOMER_ID,
        status: 'REQUESTED',
      });
      mockPrisma.videoConsultation.update.mockResolvedValue({
        id: CONSULTATION_ID,
        status: 'SCHEDULED',
        consultantId: CONSULTANT_ID,
        customerId: CUSTOMER_ID,
        meetingUrl: `https://meet.jit.si/caratflow-${CONSULTATION_ID}`,
      });

      const result = await service.schedule(
        TEST_TENANT_ID,
        CONSULTATION_ID,
        CONSULTANT_ID,
        new Date('2026-05-01T10:00:00Z'),
      );

      expect(result.status).toBe('SCHEDULED');
      expect(mockPrisma.videoConsultation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SCHEDULED',
            consultantId: CONSULTANT_ID,
            meetingUrl: `https://meet.jit.si/caratflow-${CONSULTATION_ID}`,
          }),
        }),
      );
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'crm.consultation.scheduled' }),
      );
    });

    it('rejects scheduling if status is not REQUESTED', async () => {
      mockPrisma.videoConsultation.findFirst.mockResolvedValue({
        id: CONSULTATION_ID,
        tenantId: TEST_TENANT_ID,
        status: 'SCHEDULED',
      });

      await expect(
        service.schedule(TEST_TENANT_ID, CONSULTATION_ID, CONSULTANT_ID, new Date()),
      ).rejects.toThrow(/Cannot schedule/);
    });
  });

  describe('start', () => {
    it('transitions SCHEDULED -> IN_PROGRESS with startedAt', async () => {
      mockPrisma.videoConsultation.findFirst.mockResolvedValue({
        id: CONSULTATION_ID,
        tenantId: TEST_TENANT_ID,
        status: 'SCHEDULED',
      });
      mockPrisma.videoConsultation.update.mockResolvedValue({
        id: CONSULTATION_ID,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      });

      const result = await service.start(TEST_TENANT_ID, CONSULTATION_ID);

      expect(result.status).toBe('IN_PROGRESS');
      expect(mockPrisma.videoConsultation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
    });

    it('rejects start if not SCHEDULED', async () => {
      mockPrisma.videoConsultation.findFirst.mockResolvedValue({
        id: CONSULTATION_ID,
        tenantId: TEST_TENANT_ID,
        status: 'REQUESTED',
      });

      await expect(service.start(TEST_TENANT_ID, CONSULTATION_ID)).rejects.toThrow(/Cannot start/);
    });
  });

  describe('complete', () => {
    it('transitions IN_PROGRESS -> COMPLETED with endedAt', async () => {
      mockPrisma.videoConsultation.findFirst.mockResolvedValue({
        id: CONSULTATION_ID,
        tenantId: TEST_TENANT_ID,
        status: 'IN_PROGRESS',
        notes: null,
      });
      mockPrisma.videoConsultation.update.mockResolvedValue({
        id: CONSULTATION_ID,
        status: 'COMPLETED',
      });

      const result = await service.complete(TEST_TENANT_ID, CONSULTATION_ID, 'Customer purchased');
      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.videoConsultation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            notes: 'Customer purchased',
          }),
        }),
      );
    });
  });

  describe('cancel', () => {
    it('transitions REQUESTED -> CANCELLED', async () => {
      mockPrisma.videoConsultation.findFirst.mockResolvedValue({
        id: CONSULTATION_ID,
        tenantId: TEST_TENANT_ID,
        status: 'REQUESTED',
        notes: null,
      });
      mockPrisma.videoConsultation.update.mockResolvedValue({
        id: CONSULTATION_ID,
        status: 'CANCELLED',
      });

      const result = await service.cancel(TEST_TENANT_ID, CONSULTATION_ID, 'Customer unavailable');
      expect(result.status).toBe('CANCELLED');
      expect(mockPrisma.videoConsultation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CANCELLED',
            notes: expect.stringContaining('Customer unavailable'),
          }),
        }),
      );
    });

    it('rejects cancelling already COMPLETED consultation', async () => {
      mockPrisma.videoConsultation.findFirst.mockResolvedValue({
        id: CONSULTATION_ID,
        tenantId: TEST_TENANT_ID,
        status: 'COMPLETED',
      });

      await expect(service.cancel(TEST_TENANT_ID, CONSULTATION_ID)).rejects.toThrow(/Cannot cancel/);
    });
  });

  describe('markNoShow', () => {
    it('transitions SCHEDULED -> NO_SHOW', async () => {
      mockPrisma.videoConsultation.findFirst.mockResolvedValue({
        id: CONSULTATION_ID,
        tenantId: TEST_TENANT_ID,
        status: 'SCHEDULED',
      });
      mockPrisma.videoConsultation.update.mockResolvedValue({
        id: CONSULTATION_ID,
        status: 'NO_SHOW',
      });

      const result = await service.markNoShow(TEST_TENANT_ID, CONSULTATION_ID);
      expect(result.status).toBe('NO_SHOW');
    });

    it('rejects no-show for REQUESTED status', async () => {
      mockPrisma.videoConsultation.findFirst.mockResolvedValue({
        id: CONSULTATION_ID,
        tenantId: TEST_TENANT_ID,
        status: 'REQUESTED',
      });

      await expect(service.markNoShow(TEST_TENANT_ID, CONSULTATION_ID)).rejects.toThrow(
        /Cannot mark no-show/,
      );
    });
  });

  describe('list', () => {
    it('returns paginated results filtered by tenantId', async () => {
      mockPrisma.videoConsultation.findMany.mockResolvedValue([
        { id: CONSULTATION_ID, status: 'REQUESTED' },
      ]);
      mockPrisma.videoConsultation.count.mockResolvedValue(1);

      const result = await service.list(TEST_TENANT_ID, { status: 'REQUESTED' }, { page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(mockPrisma.videoConsultation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TEST_TENANT_ID, status: 'REQUESTED' }),
        }),
      );
    });
  });

  describe('get', () => {
    it('throws NotFoundException for missing consultation', async () => {
      mockPrisma.videoConsultation.findFirst.mockResolvedValue(null);
      await expect(service.get(TEST_TENANT_ID, CONSULTATION_ID)).rejects.toThrow(/not found/);
    });
  });
});
