import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, createMockEventBusService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { AmlAlertService } from '../aml.alert.service';

describe('AmlAlertService', () => {
  let service: AmlAlertService; let prisma: ReturnType<typeof createMockPrismaService>;
  let eventBus: ReturnType<typeof createMockEventBusService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    eventBus = createMockEventBusService();
    ['amlAlert','amlSarReport'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() }; });
    prisma.customer.findMany = vi.fn() as any;
    service = new AmlAlertService(prisma as never, eventBus as never);
  });

  describe('reviewAlert', () => {
    it('should set status to UNDER_REVIEW', async () => {
      (prisma as any).amlAlert.findFirstOrThrow.mockResolvedValue({ id: 'al-1', status: 'NEW' });
      (prisma as any).amlAlert.update.mockResolvedValue({ id: 'al-1', status: 'UNDER_REVIEW' });
      const r = await service.reviewAlert(tenantId, userId, 'al-1', 'reviewing');
      expect(r.status).toBe('UNDER_REVIEW');
    });
    it('should reject already cleared alert', async () => {
      (prisma as any).amlAlert.findFirstOrThrow.mockResolvedValue({ id: 'al-1', status: 'CLEARED' });
      await expect(service.reviewAlert(tenantId, userId, 'al-1')).rejects.toThrow();
    });
  });

  describe('escalateAlert', () => {
    it('should escalate and publish event', async () => {
      (prisma as any).amlAlert.findFirstOrThrow.mockResolvedValue({ id: 'al-1' });
      (prisma as any).amlAlert.update.mockResolvedValue({ id: 'al-1', status: 'ESCALATED', customerId: 'c1', severity: 'HIGH' });
      await service.escalateAlert(tenantId, userId, 'al-1');
      expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'compliance.aml.alert_escalated' }));
    });
  });

  describe('clearAlert', () => {
    it('should clear alert', async () => {
      (prisma as any).amlAlert.findFirstOrThrow.mockResolvedValue({ id: 'al-1' });
      (prisma as any).amlAlert.update.mockResolvedValue({ id: 'al-1', status: 'CLEARED' });
      const r = await service.clearAlert(tenantId, userId, 'al-1', 'false positive');
      expect(r.status).toBe('CLEARED');
    });
  });

  describe('reportToFiu', () => {
    it('should mark as REPORTED', async () => {
      (prisma as any).amlAlert.findFirstOrThrow.mockResolvedValue({ id: 'al-1' });
      (prisma as any).amlAlert.update.mockResolvedValue({ id: 'al-1', status: 'REPORTED', reportedToFiu: true });
      const r = await service.reportToFiu(tenantId, userId, 'al-1');
      expect(r.status).toBe('REPORTED');
    });
  });

  describe('getAlertsDashboard', () => {
    it('should return dashboard data', async () => {
      (prisma as any).amlAlert.count.mockResolvedValue(5);
      (prisma as any).amlAlert.findMany.mockResolvedValue([]);
      prisma.customer.findMany.mockResolvedValue([]);
      const r = await service.getAlertsDashboard(tenantId);
      expect(r.alertsByStatus).toBeDefined();
      expect(r.alertsBySeverity).toBeDefined();
    });
  });

  describe('listAlerts', () => {
    it('should return paginated alerts', async () => {
      (prisma as any).amlAlert.findMany.mockResolvedValue([{ id: 'al-1', customerId: 'c1', amountPaise: 500000n, rule: { ruleName: 'R1', ruleType: 'HIGH_VALUE' } }]);
      (prisma as any).amlAlert.count.mockResolvedValue(1);
      prisma.customer.findMany.mockResolvedValue([{ id: 'c1', firstName: 'A', lastName: 'B' }] as any);
      const r = await service.listAlerts(tenantId);
      expect(r.total).toBe(1);
    });
  });

  describe('createSarReport', () => {
    it('should create SAR report in DRAFT status', async () => {
      (prisma as any).amlSarReport.create.mockResolvedValue({ id: 'sr-1', filingStatus: 'DRAFT' });
      const r = await service.createSarReport(tenantId, userId, { alertId: 'al-1', customerId: 'c1', reportType: 'STR', reportData: {} } as any);
      expect(r.filingStatus).toBe('DRAFT');
    });
  });
});
