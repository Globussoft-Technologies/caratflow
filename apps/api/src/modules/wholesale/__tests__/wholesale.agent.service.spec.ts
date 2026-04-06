import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { WholesaleAgentService } from '../wholesale.agent.service';

describe('WholesaleAgentService', () => {
  let service: WholesaleAgentService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['agentBroker','agentCommission'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() }; });
    service = new WholesaleAgentService(prisma as never);
  });

  const mkAgent = (o: Record<string, unknown> = {}) => ({
    id: 'a-1', tenantId, name: 'Agent One', phone: '123', email: 'a@b.com',
    commissionType: 'PERCENTAGE', commissionRate: 250, isActive: true,
    bankAccountNumber: null, ifscCode: null, panNumber: null,
    commissions: [], createdAt: new Date(), updatedAt: new Date(), ...o,
  });

  describe('createAgent', () => {
    it('should create agent', async () => {
      (prisma as any).agentBroker.create.mockResolvedValue(mkAgent());
      const r = await service.createAgent(tenantId, userId, { name: 'Agent One', commissionType: 'PERCENTAGE', commissionRate: 250 } as any);
      expect(r.name).toBe('Agent One');
    });
  });

  describe('calculateCommission', () => {
    it('should calculate percentage commission', async () => {
      (prisma as any).agentBroker.findFirst.mockResolvedValue(mkAgent({ commissionType: 'PERCENTAGE', commissionRate: 250 }));
      (prisma as any).agentCommission.create.mockResolvedValue({ id: 'c-1', amountPaise: 2500n, status: 'PENDING', agentBroker: { name: 'Agent One' }, tenantId, agentBrokerId: 'a-1', referenceType: 'ORDER', referenceId: 'o-1', createdAt: new Date(), updatedAt: new Date() });
      const r = await service.calculateCommission(tenantId, userId, { agentBrokerId: 'a-1', amountPaise: 100000, referenceType: 'ORDER', referenceId: 'o-1' } as any);
      expect(r.amountPaise).toBe(2500);
    });
    it('should calculate fixed per piece commission', async () => {
      (prisma as any).agentBroker.findFirst.mockResolvedValue(mkAgent({ commissionType: 'FIXED_PER_PIECE', commissionRate: 5000 }));
      (prisma as any).agentCommission.create.mockResolvedValue({ id: 'c-1', amountPaise: 5000n, status: 'PENDING', agentBroker: { name: 'Agent One' }, tenantId, agentBrokerId: 'a-1', referenceType: 'ORDER', referenceId: 'o-1', createdAt: new Date(), updatedAt: new Date() });
      const r = await service.calculateCommission(tenantId, userId, { agentBrokerId: 'a-1', amountPaise: 100000, referenceType: 'ORDER', referenceId: 'o-1' } as any);
      expect(r.amountPaise).toBe(5000);
    });
    it('should reject inactive agent', async () => {
      (prisma as any).agentBroker.findFirst.mockResolvedValue(mkAgent({ isActive: false }));
      await expect(service.calculateCommission(tenantId, userId, { agentBrokerId: 'a-1', amountPaise: 100000, referenceType: 'ORDER', referenceId: 'o-1' } as any)).rejects.toThrow(BadRequestException);
    });
    it('should throw NotFoundException for missing agent', async () => {
      (prisma as any).agentBroker.findFirst.mockResolvedValue(null);
      await expect(service.calculateCommission(tenantId, userId, { agentBrokerId: 'x', amountPaise: 100000, referenceType: 'ORDER', referenceId: 'o-1' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveCommission', () => {
    it('should approve pending commission', async () => {
      (prisma as any).agentCommission.findFirst.mockResolvedValueOnce({ id: 'c-1', status: 'PENDING' }).mockResolvedValueOnce({ id: 'c-1', status: 'APPROVED', amountPaise: 5000n, agentBroker: { name: 'A' }, tenantId, agentBrokerId: 'a-1', referenceType: 'ORDER', referenceId: 'o-1', createdAt: new Date(), updatedAt: new Date() });
      (prisma as any).agentCommission.update.mockResolvedValue({});
      const r = await service.approveCommission(tenantId, userId, 'c-1');
      expect(r.status).toBe('APPROVED');
    });
    it('should reject non-pending', async () => {
      (prisma as any).agentCommission.findFirst.mockResolvedValue({ id: 'c-1', status: 'APPROVED' });
      await expect(service.approveCommission(tenantId, userId, 'c-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('markCommissionPaid', () => {
    it('should mark approved commission as paid', async () => {
      (prisma as any).agentCommission.findFirst.mockResolvedValueOnce({ id: 'c-1', status: 'APPROVED' }).mockResolvedValueOnce({ id: 'c-1', status: 'PAID', amountPaise: 5000n, agentBroker: { name: 'A' }, tenantId, agentBrokerId: 'a-1', referenceType: 'ORDER', referenceId: 'o-1', paidAt: new Date(), createdAt: new Date(), updatedAt: new Date() });
      (prisma as any).agentCommission.update.mockResolvedValue({});
      const r = await service.markCommissionPaid(tenantId, userId, 'c-1', 'REF-123');
      expect(r.status).toBe('PAID');
    });
    it('should reject non-approved', async () => {
      (prisma as any).agentCommission.findFirst.mockResolvedValue({ id: 'c-1', status: 'PENDING' });
      await expect(service.markCommissionPaid(tenantId, userId, 'c-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAgent', () => {
    it('should return agent', async () => {
      (prisma as any).agentBroker.findFirst.mockResolvedValue(mkAgent());
      const r = await service.getAgent(tenantId, 'a-1');
      expect(r.id).toBe('a-1');
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).agentBroker.findFirst.mockResolvedValue(null);
      await expect(service.getAgent(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
