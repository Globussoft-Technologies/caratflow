import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { CrmService } from '../crm.service';

describe('CrmService', () => {
  let service: CrmService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['loyaltyTransaction','customerOccasion','customerInteraction','feedback','digitalPassbook','invoice','lead','customerSegment'].forEach(m => {
      (prisma as any)[m] = { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() };
    });
    prisma.customer.findFirstOrThrow = vi.fn() as any;
    prisma.customer.findMany = vi.fn() as any;
    prisma.customer.findFirst = vi.fn() as any;
    prisma.customer.count = vi.fn() as any;
    prisma.customer.create = vi.fn() as any;
    service = new CrmService(prisma as never);
  });

  describe('getCustomer360', () => {
    it('should aggregate customer data', async () => {
      prisma.customer.findFirstOrThrow = vi.fn().mockResolvedValue({ id: 'c1', firstName: 'A', lastName: 'B', loyaltyPoints: 100, loyaltyTier: 'SILVER', email: 'a@b.com', phone: '123', alternatePhone: null, address: null, city: 'Mumbai', state: 'MH', country: 'IN', postalCode: '400001', customerType: 'RETAIL', panNumber: null, aadhaarNumber: null, gstinNumber: null, dateOfBirth: null, anniversary: null, createdAt: new Date() }) as any;
      (prisma as any).loyaltyTransaction.findMany.mockResolvedValue([]);
      (prisma as any).customerOccasion.findMany.mockResolvedValue([]);
      (prisma as any).customerInteraction.findMany.mockResolvedValue([]);
      (prisma as any).feedback.findMany.mockResolvedValue([]);
      (prisma as any).digitalPassbook.findMany.mockResolvedValue([]);
      (prisma as any).invoice.findMany.mockResolvedValue([]);
      const r = await service.getCustomer360(tenantId, 'c1');
      expect(r.profile.id).toBe('c1');
      expect(r.loyalty).toBeDefined();
    });
  });

  describe('searchCustomers', () => {
    it('should search by query', async () => {
      prisma.customer.findMany.mockResolvedValue([{ id: 'c1', firstName: 'Rajesh' }] as any);
      const r = await service.searchCustomers(tenantId, { query: 'Rajesh', limit: 10 });
      expect(r).toHaveLength(1);
    });
  });

  describe('evaluateSegment', () => {
    it('should return count and sample IDs', async () => {
      prisma.customer.count.mockResolvedValue(25);
      prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }] as any);
      const r = await service.evaluateSegment(tenantId, { customerType: ['RETAIL'] });
      expect(r.count).toBe(25);
      expect(r.sampleIds).toHaveLength(2);
    });
  });

  describe('importCustomers', () => {
    it('should import valid rows', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.customer.create.mockResolvedValue({ id: 'c1' } as any);
      const r = await service.importCustomers(tenantId, userId, [{ firstName: 'A', lastName: 'B', phone: '123' }]);
      expect(r.imported).toBe(1);
      expect(r.skipped).toBe(0);
    });
    it('should skip rows missing firstName', async () => {
      const r = await service.importCustomers(tenantId, userId, [{ firstName: '', lastName: 'B' } as any]);
      expect(r.skipped).toBe(1);
      expect(r.errors).toHaveLength(1);
    });
    it('should skip duplicates by phone', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'existing' } as any);
      const r = await service.importCustomers(tenantId, userId, [{ firstName: 'A', lastName: 'B', phone: '123' }]);
      expect(r.skipped).toBe(1);
      expect(r.imported).toBe(0);
    });
    it('should handle mixed valid and invalid rows', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      prisma.customer.create.mockResolvedValue({ id: 'c1' } as any);
      const r = await service.importCustomers(tenantId, userId, [{ firstName: 'A', lastName: 'B' }, { firstName: '', lastName: '' } as any]);
      expect(r.imported).toBe(1);
      expect(r.skipped).toBe(1);
    });
  });

  describe('listCustomers', () => {
    it('should return paginated list', async () => {
      prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }] as any);
      prisma.customer.count.mockResolvedValue(1);
      const r = await service.listCustomers(tenantId, { page: 1, limit: 20 } as any);
      expect(r.total).toBe(1);
    });
  });

  describe('createSegment', () => {
    it('should create segment with count', async () => {
      prisma.customer.count.mockResolvedValue(10);
      prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }] as any);
      (prisma as any).customerSegment.create.mockResolvedValue({ id: 's-1', customerCount: 10 });
      const r = await service.createSegment(tenantId, userId, { name: 'VIPs', criteria: { customerType: ['RETAIL'] } } as any);
      expect(r.customerCount).toBe(10);
    });
  });

  describe('listSegments', () => {
    it('should return segments', async () => {
      (prisma as any).customerSegment.findMany.mockResolvedValue([{ id: 's-1' }]);
      const r = await service.listSegments(tenantId);
      expect(r).toHaveLength(1);
    });
  });
});
