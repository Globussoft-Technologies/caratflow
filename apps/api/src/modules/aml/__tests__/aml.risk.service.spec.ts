import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { AmlRiskService } from '../aml.risk.service';

describe('AmlRiskService', () => {
  let service: AmlRiskService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['amlAlert','amlCustomerRisk'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() }; });
    prisma.customer.findFirstOrThrow = vi.fn() as any;
    prisma.customer.findMany = vi.fn() as any;
    prisma.customer.count = vi.fn() as any;
    service = new AmlRiskService(prisma as never);
  });

  describe('calculateCustomerRisk', () => {
    it('should return LOW risk for fully KYCd customer with no alerts', async () => {
      (prisma.customer.findFirstOrThrow as any).mockResolvedValue({ id: 'c1', panNumber: 'PAN123', aadhaarNumber: 'AAD123', country: 'IN', phone: '123', email: 'a@b.com', customerType: 'RETAIL' });
      (prisma as any).amlAlert.count.mockResolvedValue(0);
      (prisma as any).amlCustomerRisk.findFirst.mockResolvedValue(null);
      (prisma as any).amlCustomerRisk.create.mockResolvedValue({});
      const r = await service.calculateCustomerRisk(tenantId, 'c1');
      expect(r.riskLevel).toBe('LOW');
      expect(r.riskScore).toBeLessThan(25);
    });
    it('should score higher for incomplete KYC', async () => {
      (prisma.customer.findFirstOrThrow as any).mockResolvedValue({ id: 'c1', panNumber: null, aadhaarNumber: null, country: 'IN', phone: '123', email: 'a@b.com', customerType: 'RETAIL' });
      (prisma as any).amlAlert.count.mockResolvedValue(0);
      (prisma as any).amlCustomerRisk.findFirst.mockResolvedValue(null);
      (prisma as any).amlCustomerRisk.create.mockResolvedValue({});
      const r = await service.calculateCustomerRisk(tenantId, 'c1');
      expect(r.riskScore).toBeGreaterThanOrEqual(25);
    });
    it('should score higher for high-risk country', async () => {
      (prisma.customer.findFirstOrThrow as any).mockResolvedValue({ id: 'c1', panNumber: 'PAN', aadhaarNumber: 'AAD', country: 'AF', phone: '123', email: 'a@b.com', customerType: 'RETAIL' });
      (prisma as any).amlAlert.count.mockResolvedValue(0);
      (prisma as any).amlCustomerRisk.findFirst.mockResolvedValue(null);
      (prisma as any).amlCustomerRisk.create.mockResolvedValue({});
      const r = await service.calculateCustomerRisk(tenantId, 'c1');
      expect(r.factors.some((f: any) => f.factor === 'HIGH_RISK_COUNTRY')).toBe(true);
    });
    it('should score higher with escalated alerts', async () => {
      (prisma.customer.findFirstOrThrow as any).mockResolvedValue({ id: 'c1', panNumber: 'PAN', aadhaarNumber: 'AAD', country: 'IN', phone: '123', email: 'a@b.com', customerType: 'RETAIL' });
      (prisma as any).amlAlert.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockResolvedValueOnce(3);
      (prisma as any).amlCustomerRisk.findFirst.mockResolvedValue(null);
      (prisma as any).amlCustomerRisk.create.mockResolvedValue({});
      const r = await service.calculateCustomerRisk(tenantId, 'c1');
      expect(r.factors.some((f: any) => f.factor === 'ESCALATED_ALERTS')).toBe(true);
    });
  });

  describe('getCustomerRisk', () => {
    it('should return existing risk profile', async () => {
      (prisma as any).amlCustomerRisk.findFirst.mockResolvedValue({ riskScore: 30, riskLevel: 'MEDIUM', factors: [], lastAssessedAt: new Date(), nextReviewDate: new Date(), kycStatus: 'VERIFIED', transactionVolumePaise: 0n, transactionCount: 0, flagCount: 0 });
      (prisma.customer.findFirstOrThrow as any).mockResolvedValue({ firstName: 'A', lastName: 'B' });
      const r = await service.getCustomerRisk(tenantId, 'c1');
      expect(r.riskLevel).toBe('MEDIUM');
    });
  });

  describe('getRiskDistribution', () => {
    it('should return counts by level', async () => {
      (prisma as any).amlCustomerRisk.count.mockResolvedValue(5);
      const r = await service.getRiskDistribution(tenantId);
      expect(r).toHaveProperty('LOW');
      expect(r).toHaveProperty('HIGH');
    });
  });

  describe('listHighRiskCustomers', () => {
    it('should return paginated high-risk customers', async () => {
      (prisma as any).amlCustomerRisk.findMany.mockResolvedValue([{ customerId: 'c1', transactionVolumePaise: 500000n }]);
      (prisma as any).amlCustomerRisk.count.mockResolvedValue(1);
      prisma.customer.findMany.mockResolvedValue([{ id: 'c1', firstName: 'A', lastName: 'B' }] as any);
      const r = await service.listHighRiskCustomers(tenantId);
      expect(r.total).toBe(1);
    });
  });
});
