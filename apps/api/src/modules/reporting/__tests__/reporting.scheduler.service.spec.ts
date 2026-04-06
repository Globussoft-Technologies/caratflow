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

describe('ReportingSchedulerService (Unit)', () => {
  let service: ReportingSchedulerService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new ReportingSchedulerService(mockPrisma as any);
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
        id: 'sr-1', reportType: 'SALES', filters: { dateRange: {} },
      };
      mockPrisma.scheduledReport.findUnique.mockResolvedValue({
        id: 'sched-1', isActive: true, savedReportId: 'sr-1',
        savedReport, format: 'PDF',
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
