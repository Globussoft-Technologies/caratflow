import { describe, it, expect, beforeEach } from 'vitest';
import { TrpcService } from '../trpc.service';
import { TRPCError } from '@trpc/server';

describe('TrpcService', () => {
  let service: TrpcService;

  beforeEach(() => {
    service = new TrpcService();
  });

  it('exposes a router builder function', () => {
    expect(typeof service.router).toBe('function');
  });

  it('exposes a base procedure builder', () => {
    expect(service.procedure).toBeDefined();
    // procedure should have .use, .input, .query, .mutation methods
    expect(typeof service.procedure.use).toBe('function');
  });

  it('exposes a mergeRouters function', () => {
    expect(typeof service.mergeRouters).toBe('function');
  });

  it('creates an authedProcedure that rejects when auth context is missing', async () => {
    // Build a minimal router using authedProcedure
    const router = service.router({
      testQuery: service.authedProcedure.query(({ ctx }) => {
        return { tenantId: ctx.tenantId, userId: ctx.userId };
      }),
    });

    const caller = router.createCaller({
      tenantId: undefined,
      userId: undefined,
    });

    await expect(caller.testQuery()).rejects.toThrow(TRPCError);
    await expect(caller.testQuery()).rejects.toThrow('Authentication required');
  });

  it('authedProcedure passes through when auth context is present', async () => {
    const router = service.router({
      testQuery: service.authedProcedure.query(({ ctx }) => {
        return { tenantId: ctx.tenantId, userId: ctx.userId };
      }),
    });

    const caller = router.createCaller({
      tenantId: 'tenant-1',
      userId: 'user-1',
      userRole: 'admin',
      userPermissions: ['inventory.read'],
    });

    const result = await caller.testQuery();
    expect(result.tenantId).toBe('tenant-1');
    expect(result.userId).toBe('user-1');
  });
});
