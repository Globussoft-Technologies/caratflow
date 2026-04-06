import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  function createMockContext(requestOverrides: Record<string, unknown> = {}) {
    const request = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      ...requestOverrides,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  }

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('allows request with valid userId and tenantId', () => {
    const context = createMockContext({
      userId: 'user-1',
      tenantId: 'tenant-1',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects request with missing userId', () => {
    const context = createMockContext({
      userId: undefined,
      tenantId: 'tenant-1',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects request with missing tenantId', () => {
    const context = createMockContext({
      userId: 'user-1',
      tenantId: undefined,
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects request with both userId and tenantId missing', () => {
    const context = createMockContext({
      userId: undefined,
      tenantId: undefined,
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects request with empty string userId', () => {
    const context = createMockContext({
      userId: '',
      tenantId: 'tenant-1',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects request with empty string tenantId', () => {
    const context = createMockContext({
      userId: 'user-1',
      tenantId: '',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws error with message indicating authentication required', () => {
    const context = createMockContext({
      userId: undefined,
      tenantId: undefined,
    });

    try {
      guard.canActivate(context);
      expect.fail('Should have thrown');
    } catch (e) {
      expect((e as UnauthorizedException).message).toBe('Authentication required');
    }
  });
});
