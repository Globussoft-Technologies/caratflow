import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock bullmq before importing the service
vi.mock('bullmq', () => {
  const mockQueue = {
    add: vi.fn().mockResolvedValue({}),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const mockWorker = {
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return {
    Queue: vi.fn(() => mockQueue),
    Worker: vi.fn(() => mockWorker),
  };
});

import { ReportingSchedulerService } from '../reporting.scheduler.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    scheduledReport: {
      findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(),
    },
    reportExecution: {
      create: vi.fn(), update: vi.fn(),
    },
  };
}

function makeMocks() {
  const fileService = {
    uploadBuffer: vi.fn().mockResolvedValue({
      url: 'https://s3.example.com/reports/tenant/sr/key.csv',
      key: 'reports/tenant/sr/key.csv',
      bucket: 'caratflow',
      mimeType: 'text/csv',
      size: 10,
    }),
    getSignedGetUrl: vi.fn().mockResolvedValue('https://signed.example.com/report.csv?sig=abc'),
  };
  const pdfService = {
    renderHtmlToPdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock')),
  };
  const emailService = {
    sendEmail: vi.fn().mockResolvedValue({ success: true, externalId: 'e-1', statusCode: 202 }),
  };
  const customService = {
    executeCustomReport: vi.fn().mockResolvedValue({ rows: [] }),
  };
  return { fileService, pdfService, emailService, customService };
}

describe('ReportingSchedulerService (Unit)', () => {
  let service: ReportingSchedulerService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    mocks = makeMocks();
    service = new ReportingSchedulerService(
      mockPrisma as any,
      mocks.fileService as any,
      mocks.pdfService as any,
      mocks.emailService as any,
      mocks.customService as any,
    );
  });

  describe('onModuleInit', () => {
    it('initializes without error', async () => {
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('onModuleDestroy', () => {
    it('cleans up without error', async () => {
      await service.onModuleInit();
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('checkAndEnqueueDueReports (via processScheduledReport)', () => {
    it('processes a scheduled report execution', async () => {
      const savedReport = {
        id: 'sr-1', reportType: 'SALES', filters: { dateRange: {} }, columns: ['id'],
        name: 'Sales Report',
      };
      mockPrisma.scheduledReport.findUnique.mockResolvedValue({
        id: 'sched-1', isActive: true, savedReportId: 'sr-1',
        savedReport, format: 'PDF', recipients: ['ops@example.com'],
      });
      mockPrisma.reportExecution.create.mockResolvedValue({
        id: 'exec-1', tenantId: TEST_TENANT_ID,
      });
      mockPrisma.reportExecution.update.mockResolvedValue({});
      mockPrisma.scheduledReport.update.mockResolvedValue({});

      // Access the private method via any
      await (service as any).processScheduledReport({
        scheduledReportId: 'sched-1',
        tenantId: TEST_TENANT_ID,
      });

      expect(mockPrisma.reportExecution.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'RUNNING' }),
        }),
      );
      expect(mockPrisma.reportExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
      // Artifact was generated and uploaded
      expect(mocks.pdfService.renderHtmlToPdf).toHaveBeenCalled();
      expect(mocks.fileService.uploadBuffer).toHaveBeenCalled();
      expect(mocks.fileService.getSignedGetUrl).toHaveBeenCalled();
      // Recipients were emailed
      expect(mocks.emailService.sendEmail).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        expect.objectContaining({
          to: ['ops@example.com'],
          subject: expect.stringContaining('Sales Report'),
        }),
      );
    });

    it('skips inactive scheduled reports', async () => {
      mockPrisma.scheduledReport.findUnique.mockResolvedValue({
        id: 'sched-1', isActive: false,
      });

      await (service as any).processScheduledReport({
        scheduledReportId: 'sched-1',
        tenantId: TEST_TENANT_ID,
      });

      expect(mockPrisma.reportExecution.create).not.toHaveBeenCalled();
    });

    it('marks execution FAILED when artifact upload throws', async () => {
      const savedReport = {
        id: 'sr-1', reportType: 'SALES', filters: {}, columns: [],
        name: 'R',
      };
      mockPrisma.scheduledReport.findUnique.mockResolvedValue({
        id: 'sched-2', isActive: true, savedReportId: 'sr-1',
        savedReport, format: 'CSV', recipients: [],
      });
      mockPrisma.reportExecution.create.mockResolvedValue({ id: 'exec-2', tenantId: TEST_TENANT_ID });
      mockPrisma.reportExecution.update.mockResolvedValue({});
      mocks.fileService.uploadBuffer.mockRejectedValueOnce(new Error('S3 down'));

      await expect(
        (service as any).processScheduledReport({
          scheduledReportId: 'sched-2',
          tenantId: TEST_TENANT_ID,
        }),
      ).rejects.toThrow('S3 down');

      expect(mockPrisma.reportExecution.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED', error: 'S3 down' }),
        }),
      );
    });
  });

  describe('calculateNextRunAt', () => {
    it('calculates next daily run', () => {
      const next = (service as any).calculateNextRunAt('DAILY', null, null, '08:00');
      expect(next).toBeInstanceOf(Date);
      expect(next.getHours()).toBe(8);
      expect(next.getMinutes()).toBe(0);
    });

    it('calculates next weekly run on specified day', () => {
      const next = (service as any).calculateNextRunAt('WEEKLY', 1, null, '09:00'); // Monday
      expect(next).toBeInstanceOf(Date);
      expect(next.getDay()).toBe(1); // Monday
    });

    it('calculates next monthly run on specified date', () => {
      const next = (service as any).calculateNextRunAt('MONTHLY', null, 15, '10:00');
      expect(next).toBeInstanceOf(Date);
      expect(next.getDate()).toBeLessThanOrEqual(15);
    });
  });
});
