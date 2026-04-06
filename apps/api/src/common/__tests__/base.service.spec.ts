import { describe, it, expect, beforeEach } from 'vitest';
import { TenantAwareService } from '../base.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../__tests__/setup';

/** Concrete subclass for testing the abstract TenantAwareService */
class TestService extends TenantAwareService {
  /** Expose protected tenantWhere for testing */
  public callTenantWhere(tenantId: string, where?: Record<string, unknown>) {
    return this.tenantWhere(tenantId, where);
  }

  /** Expose protected prisma for testing */
  public getPrisma() {
    return this.prisma;
  }
}

describe('TenantAwareService (base.service)', () => {
  let service: TestService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  const TENANT = TEST_TENANT_ID;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new TestService(mockPrisma as any);
  });

  describe('tenantWhere', () => {
    it('returns object with tenantId when called with no additional where clause', () => {
      const result = service.callTenantWhere(TENANT);
      expect(result).toEqual({ tenantId: TENANT });
    });

    it('merges tenantId into existing where clause', () => {
      const result = service.callTenantWhere(TENANT, { id: 'item-1', isActive: true });
      expect(result).toEqual({
        tenantId: TENANT,
        id: 'item-1',
        isActive: true,
      });
    });

    it('overrides any tenantId already present in where clause', () => {
      const result = service.callTenantWhere(TENANT, { tenantId: 'malicious-tenant', id: 'item-1' });
      // The spread puts tenantId last, so our tenantId wins
      expect(result.tenantId).toBe(TENANT);
    });

    it('handles empty where object', () => {
      const result = service.callTenantWhere(TENANT, {});
      expect(result).toEqual({ tenantId: TENANT });
    });
  });

  describe('prisma access', () => {
    it('exposes the prisma service to subclasses', () => {
      expect(service.getPrisma()).toBe(mockPrisma);
    });
  });
});
