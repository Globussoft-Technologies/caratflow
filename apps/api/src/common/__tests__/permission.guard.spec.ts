import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionGuard, PERMISSION_KEY } from '../permission.guard';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let mockReflector: {
    getAllAndOverride: ReturnType<typeof vi.fn>;
  };

  function createMockContext(requestOverrides: Record<string, unknown> = {}) {
    const request = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      userPermissions: ['inventory.stock.read', 'retail.*'],
      ...requestOverrides,
    };
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  }

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn().mockReturnValue(null),
    };
    guard = new PermissionGuard(mockReflector as any);
  });

  it('allows request when no permissions are required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows request when required permissions list is empty', () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows request when user has exact permission', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['inventory.stock.read']);
    const context = createMockContext({
      userPermissions: ['inventory.stock.read', 'inventory.stock.write'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows request when user has wildcard module.* permission', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['retail.sale.create']);
    const context = createMockContext({
      userPermissions: ['retail.*'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows request when user has global wildcard * permission', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['compliance.huid.verify']);
    const context = createMockContext({
      userPermissions: ['*'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies request when user lacks required permission', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['compliance.huid.verify']);
    const context = createMockContext({
      userPermissions: ['inventory.stock.read'],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('denies request when no user on request (userId missing)', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['inventory.stock.read']);
    const context = createMockContext({ userId: undefined });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('denies request when user has no permissions array', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['inventory.stock.read']);
    const context = createMockContext({ userPermissions: undefined });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('denies request when user has empty permissions array', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['inventory.stock.read']);
    const context = createMockContext({ userPermissions: [] });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('handles multiple required permissions with AND logic', () => {
    mockReflector.getAllAndOverride.mockReturnValue([
      'inventory.stock.read',
      'inventory.stock.write',
    ]);
    const context = createMockContext({
      userPermissions: ['inventory.stock.read', 'inventory.stock.write'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies when user has only some of multiple required permissions', () => {
    mockReflector.getAllAndOverride.mockReturnValue([
      'inventory.stock.read',
      'inventory.stock.write',
    ]);
    const context = createMockContext({
      userPermissions: ['inventory.stock.read'],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('includes missing permissions in the error message', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['compliance.huid.verify']);
    const context = createMockContext({
      userPermissions: ['inventory.stock.read'],
    });

    try {
      guard.canActivate(context);
      expect.fail('Should have thrown');
    } catch (e) {
      expect((e as ForbiddenException).message).toContain('compliance.huid.verify');
    }
  });

  it('partial wildcard matches prefix correctly', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['inventory.stock.read']);
    const context = createMockContext({
      userPermissions: ['inventory.*'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('partial wildcard does not match different module', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['retail.sale.create']);
    const context = createMockContext({
      userPermissions: ['inventory.*'],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
