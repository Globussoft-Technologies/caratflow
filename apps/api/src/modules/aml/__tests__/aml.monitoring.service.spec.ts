import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { AmlMonitoringService } from '../aml.monitoring.service';

describe('AmlMonitoringService', () => {
  let service: AmlMonitoringService; let prisma: ReturnType<typeof createMockPrismaService>;
  let amlService: any; let riskService: any;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['payment','amlCustomerRisk','amlAlert'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() }; });
    amlService = { evaluateTransaction: vi.fn().mockResolvedValue({ passed: true, alertsCreated: 0 }) };
    riskService = { calculateCustomerRisk: vi.fn().mockResolvedValue({}) };
    service = new AmlMonitoringService(prisma as never, amlService, riskService);
  });

  describe('monitorTransactions', () => {
    it('should check recent payments', async () => {
      (prisma as any).payment.findMany.mockResolvedValue([{ id: 'pay-1', customerId: 'c1', amountPaise: 500000n, paymentMethod: 'CASH' }]);
      const r = await service.monitorTransactions(tenantId, 60);
      expect(r.transactionsChecked).toBe(1);
      expect(r.alertsCreated).toBe(0);
    });
    it('should create alerts and reassess risk when flagged', async () => {
      (prisma as any).payment.findMany.mockResolvedValue([{ id: 'pay-1', customerId: 'c1', amountPaise: 5000000n, paymentMethod: 'CASH' }]);
      amlService.evaluateTransaction.mockResolvedValue({ passed: false, alertsCreated: 1 });
      const r = await service.monitorTransactions(tenantId);
      expect(r.alertsCreated).toBe(1);
      expect(r.risksUpdated).toBe(1);
    });
  });

  describe('recalculateDueRiskScores', () => {
    it('should recalculate due scores', async () => {
      (prisma as any).amlCustomerRisk.findMany.mockResolvedValue([{ customerId: 'c1' }]);
      const r = await service.recalculateDueRiskScores(tenantId);
      expect(r).toBe(1);
    });
  });

  describe('escalateOverdueAlerts', () => {
    it('should auto-escalate overdue NEW alerts', async () => {
      (prisma as any).amlAlert.findMany.mockResolvedValue([{ id: 'al-1' }]);
      (prisma as any).amlAlert.update.mockResolvedValue({});
      const r = await service.escalateOverdueAlerts(tenantId, 48);
      expect(r).toBe(1);
    });
    it('should return 0 when no overdue alerts', async () => {
      (prisma as any).amlAlert.findMany.mockResolvedValue([]);
      const r = await service.escalateOverdueAlerts(tenantId);
      expect(r).toBe(0);
    });
  });
});
