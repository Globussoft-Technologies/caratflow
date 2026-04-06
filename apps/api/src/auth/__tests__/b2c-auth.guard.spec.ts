import { describe, it, expect, vi, beforeEach } from 'vitest';
import { B2CAuthGuard } from '../b2c-auth.guard';
import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = 'test-jwt-secret-for-caratflow-tests';

describe('B2CAuthGuard', () => {
  let guard: B2CAuthGuard;

  function createMockContext(authHeader?: string) {
    const request = {
      headers: {
        authorization: authHeader,
      },
      customerAuthId: undefined as string | undefined,
      customerId: undefined as string | undefined,
      b2cTenantId: undefined as string | undefined,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      _request: request,
    } as any;
  }

  function generateB2CToken(
    payload: Record<string, unknown>,
    options: jwt.SignOptions = {},
  ) {
    return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '15m', ...options });
  }

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    guard = new B2CAuthGuard();
  });

  it('allows valid B2C JWT with type b2c', () => {
    const token = generateB2CToken({
      sub: 'auth-1',
      type: 'b2c',
      customerId: 'cust-1',
      tenantId: 'tenant-1',
    });
    const context = createMockContext(`Bearer ${token}`);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('sets customerAuthId, customerId, and b2cTenantId on request', () => {
    const token = generateB2CToken({
      sub: 'auth-42',
      type: 'b2c',
      customerId: 'cust-42',
      tenantId: 'tenant-xyz',
    });
    const context = createMockContext(`Bearer ${token}`);

    guard.canActivate(context);

    const req = context._request;
    expect(req.customerAuthId).toBe('auth-42');
    expect(req.customerId).toBe('cust-42');
    expect(req.b2cTenantId).toBe('tenant-xyz');
  });

  it('rejects admin JWT (wrong type)', () => {
    const token = generateB2CToken({
      sub: 'user-1',
      type: 'admin', // Not b2c
      tenantId: 'tenant-1',
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['*'],
    });
    const context = createMockContext(`Bearer ${token}`);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow('Invalid token type for B2C endpoint');
  });

  it('rejects expired JWT', () => {
    const token = jwt.sign(
      {
        sub: 'auth-1',
        type: 'b2c',
        customerId: 'cust-1',
        tenantId: 'tenant-1',
      },
      TEST_JWT_SECRET,
      { expiresIn: '-1s' },
    );
    const context = createMockContext(`Bearer ${token}`);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects missing Authorization header', () => {
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow('Authentication required');
  });

  it('rejects non-Bearer Authorization header', () => {
    const context = createMockContext('Basic dXNlcjpwYXNz');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects malformed JWT', () => {
    const context = createMockContext('Bearer not-a-valid-jwt');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects token with missing sub field', () => {
    const token = generateB2CToken({
      type: 'b2c',
      customerId: 'cust-1',
      tenantId: 'tenant-1',
      sub: '', // empty
    });
    const context = createMockContext(`Bearer ${token}`);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context)).toThrow('Malformed authentication token');
  });

  it('rejects token with missing customerId', () => {
    const token = generateB2CToken({
      sub: 'auth-1',
      type: 'b2c',
      tenantId: 'tenant-1',
      // customerId missing
    });
    const context = createMockContext(`Bearer ${token}`);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects token with missing tenantId', () => {
    const token = generateB2CToken({
      sub: 'auth-1',
      type: 'b2c',
      customerId: 'cust-1',
      // tenantId missing
    });
    const context = createMockContext(`Bearer ${token}`);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects token signed with wrong secret', () => {
    const token = jwt.sign(
      {
        sub: 'auth-1',
        type: 'b2c',
        customerId: 'cust-1',
        tenantId: 'tenant-1',
      },
      'wrong-secret',
      { expiresIn: '15m' },
    );
    const context = createMockContext(`Bearer ${token}`);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
