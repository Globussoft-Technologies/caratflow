import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceAuditService } from '../compliance.audit.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ComplianceAuditService (Unit)', () => {
  let service: ComplianceAuditService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    (mockPrisma as any).complianceAudit = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };
    service = new ComplianceAuditService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── create ─────────────────────────────────────────────────────

  describe('create', () => {
    it('creates an audit with SCHEDULED status', async () => {
      (mockPrisma as any).complianceAudit.create.mockResolvedValue({
        id: 'audit-1',
        auditType: 'INTERNAL',
        auditorName: 'Rajesh Sharma',
        status: 'SCHEDULED',
        auditDate: new Date('2025-06-01'),
      });

      const result = await service.create(TEST_TENANT_ID, TEST_USER_ID, {
        auditType: 'INTERNAL',
        auditDate: new Date('2025-06-01'),
        auditorName: 'Rajesh Sharma',
      } as any);

      expect(result.status).toBe('SCHEDULED');
      expect(result.auditorName).toBe('Rajesh Sharma');
    });
  });

  // ─── startAudit ─────────────────────────────────────────────────

  describe('startAudit', () => {
    it('transitions audit to IN_PROGRESS', async () => {
      (mockPrisma as any).complianceAudit.findFirst.mockResolvedValue({
        id: 'audit-1',
        status: 'SCHEDULED',
      });
      (mockPrisma as any).complianceAudit.update.mockResolvedValue({
        id: 'audit-1',
        status: 'IN_PROGRESS',
      });

      const result = await service.startAudit(TEST_TENANT_ID, TEST_USER_ID, 'audit-1');
      expect(result.status).toBe('IN_PROGRESS');
    });

    it('throws NotFoundException for missing audit', async () => {
      (mockPrisma as any).complianceAudit.findFirst.mockResolvedValue(null);

      await expect(
        service.startAudit(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent'),
      ).rejects.toThrow('not found');
    });
  });

  // ─── recordFindings ─────────────────────────────────────────────

  describe('recordFindings', () => {
    it('records findings and sets FINDINGS_OPEN status', async () => {
      (mockPrisma as any).complianceAudit.findFirst.mockResolvedValue({
        id: 'audit-1',
        status: 'IN_PROGRESS',
        recommendations: 'existing recs',
      });
      (mockPrisma as any).complianceAudit.update.mockResolvedValue({
        id: 'audit-1',
        status: 'FINDINGS_OPEN',
        findings: 'Missing hallmark on 3 items',
        recommendations: 'existing recs',
      });

      const result = await service.recordFindings(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'audit-1',
        'Missing hallmark on 3 items',
      );

      expect(result.status).toBe('FINDINGS_OPEN');
      expect(result.findings).toBe('Missing hallmark on 3 items');
    });

    it('updates recommendations when provided', async () => {
      (mockPrisma as any).complianceAudit.findFirst.mockResolvedValue({
        id: 'audit-1',
        recommendations: null,
      });
      (mockPrisma as any).complianceAudit.update.mockResolvedValue({
        id: 'audit-1',
        status: 'FINDINGS_OPEN',
        findings: 'Finding',
        recommendations: 'New rec',
      });

      await service.recordFindings(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'audit-1',
        'Finding',
        'New rec',
      );

      expect((mockPrisma as any).complianceAudit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ recommendations: 'New rec' }),
        }),
      );
    });

    it('throws NotFoundException for missing audit', async () => {
      (mockPrisma as any).complianceAudit.findFirst.mockResolvedValue(null);

      await expect(
        service.recordFindings(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent', 'findings'),
      ).rejects.toThrow('not found');
    });
  });

  // ─── resolve ────────────────────────────────────────────────────

  describe('resolve', () => {
    it('resolves audit with RESOLVED status', async () => {
      (mockPrisma as any).complianceAudit.findFirst.mockResolvedValue({
        id: 'audit-1',
        status: 'FINDINGS_OPEN',
        findings: 'original findings',
        recommendations: 'original recs',
      });
      (mockPrisma as any).complianceAudit.update.mockResolvedValue({
        id: 'audit-1',
        status: 'RESOLVED',
        resolvedAt: new Date(),
      });

      const result = await service.resolve(TEST_TENANT_ID, TEST_USER_ID, {
        auditId: 'audit-1',
      });

      expect(result.status).toBe('RESOLVED');
    });

    it('throws NotFoundException for missing audit', async () => {
      (mockPrisma as any).complianceAudit.findFirst.mockResolvedValue(null);

      await expect(
        service.resolve(TEST_TENANT_ID, TEST_USER_ID, { auditId: 'nonexistent' }),
      ).rejects.toThrow('not found');
    });
  });

  // ─── completeAudit ──────────────────────────────────────────────

  describe('completeAudit', () => {
    it('transitions audit to COMPLETED', async () => {
      (mockPrisma as any).complianceAudit.findFirst.mockResolvedValue({
        id: 'audit-1',
        status: 'RESOLVED',
      });
      (mockPrisma as any).complianceAudit.update.mockResolvedValue({
        id: 'audit-1',
        status: 'COMPLETED',
      });

      const result = await service.completeAudit(TEST_TENANT_ID, TEST_USER_ID, 'audit-1');
      expect(result.status).toBe('COMPLETED');
    });
  });

  // ─── getUpcomingAudits ──────────────────────────────────────────

  describe('getUpcomingAudits', () => {
    it('returns upcoming SCHEDULED/IN_PROGRESS audits', async () => {
      (mockPrisma as any).complianceAudit.findMany.mockResolvedValue([
        { id: 'a1', status: 'SCHEDULED', auditDate: new Date('2026-06-01') },
        { id: 'a2', status: 'IN_PROGRESS', auditDate: new Date('2026-07-01') },
      ]);

      const results = await service.getUpcomingAudits(TEST_TENANT_ID);
      expect(results).toHaveLength(2);
    });

    it('respects limit parameter', async () => {
      (mockPrisma as any).complianceAudit.findMany.mockResolvedValue([]);

      await service.getUpcomingAudits(TEST_TENANT_ID, 3);
      expect((mockPrisma as any).complianceAudit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 }),
      );
    });
  });

  // ─── lifecycle flow ─────────────────────────────────────────────

  describe('full lifecycle', () => {
    it('SCHEDULED -> IN_PROGRESS -> FINDINGS_OPEN -> RESOLVED -> COMPLETED', async () => {
      // Each step just verifies the update call is correct
      const auditData = { id: 'audit-1', status: 'SCHEDULED', findings: null, recommendations: null };

      // Step 1: start
      (mockPrisma as any).complianceAudit.findFirst.mockResolvedValue(auditData);
      (mockPrisma as any).complianceAudit.update.mockResolvedValue({ ...auditData, status: 'IN_PROGRESS' });
      await service.startAudit(TEST_TENANT_ID, TEST_USER_ID, 'audit-1');

      // Step 2: record findings
      (mockPrisma as any).complianceAudit.findFirst.mockResolvedValue({ ...auditData, status: 'IN_PROGRESS' });
      (mockPrisma as any).complianceAudit.update.mockResolvedValue({ ...auditData, status: 'FINDINGS_OPEN' });
      await service.recordFindings(TEST_TENANT_ID, TEST_USER_ID, 'audit-1', 'Issues found');

      // Step 3: resolve
      (mockPrisma as any).complianceAudit.findFirst.mockResolvedValue({ ...auditData, status: 'FINDINGS_OPEN' });
      (mockPrisma as any).complianceAudit.update.mockResolvedValue({ ...auditData, status: 'RESOLVED' });
      await service.resolve(TEST_TENANT_ID, TEST_USER_ID, { auditId: 'audit-1' });

      // Step 4: complete
      (mockPrisma as any).complianceAudit.findFirst.mockResolvedValue({ ...auditData, status: 'RESOLVED' });
      (mockPrisma as any).complianceAudit.update.mockResolvedValue({ ...auditData, status: 'COMPLETED' });
      const final = await service.completeAudit(TEST_TENANT_ID, TEST_USER_ID, 'audit-1');

      expect(final.status).toBe('COMPLETED');
    });
  });
});
