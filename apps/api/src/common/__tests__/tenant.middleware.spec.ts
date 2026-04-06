import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantMiddleware } from '../tenant.middleware';
import * as jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = 'test-jwt-secret-for-caratflow-tests';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    middleware = new TenantMiddleware();
    mockNext = vi.fn();
  });

  function createMockRequest(authHeader?: string) {
    return {
      headers: {
        authorization: authHeader,
      },
      tenantId: undefined as string | undefined,
      userId: undefined as string | undefined,
      userRole: undefined as string | undefined,
      userPermissions: undefined as string[] | undefined,
    } as any;
  }

  function createMockResponse() {
    return {} as any;
  }

  function generateToken(payload: Record<string, unknown>, options: jwt.SignOptions = {}) {
    return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '15m', ...options });
  }

  it('extracts tenantId from JWT and sets on request', () => {
    const token = generateToken({
      sub: 'user-1',
      tenantId: 'tenant-abc',
      email: 'test@example.com',
      role: 'admin',
      permissions: ['*'],
    });

    const req = createMockRequest(`Bearer ${token}`);
    const res = createMockResponse();

    middleware.use(req, res, mockNext);

    expect(req.tenantId).toBe('tenant-abc');
    expect(mockNext).toHaveBeenCalled();
  });

  it('extracts userId from JWT', () => {
    const token = generateToken({
      sub: 'user-42',
      tenantId: 'tenant-1',
      email: 'user@example.com',
      role: 'user',
      permissions: ['inventory.stock.read'],
    });

    const req = createMockRequest(`Bearer ${token}`);
    const res = createMockResponse();

    middleware.use(req, res, mockNext);

    expect(req.userId).toBe('user-42');
  });

  it('extracts userRole and userPermissions from JWT', () => {
    const token = generateToken({
      sub: 'user-1',
      tenantId: 'tenant-1',
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['inventory.*', 'retail.sale.create'],
    });

    const req = createMockRequest(`Bearer ${token}`);
    const res = createMockResponse();

    middleware.use(req, res, mockNext);

    expect(req.userRole).toBe('admin');
    expect(req.userPermissions).toEqual(['inventory.*', 'retail.sale.create']);
  });

  it('calls next() without setting fields when no Authorization header', () => {
    const req = createMockRequest(undefined);
    const res = createMockResponse();

    middleware.use(req, res, mockNext);

    expect(req.tenantId).toBeUndefined();
    expect(req.userId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('calls next() without setting fields when Authorization is not Bearer', () => {
    const req = createMockRequest('Basic dXNlcjpwYXNz');
    const res = createMockResponse();

    middleware.use(req, res, mockNext);

    expect(req.tenantId).toBeUndefined();
    expect(req.userId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('handles expired token gracefully and calls next()', () => {
    const token = jwt.sign(
      {
        sub: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        role: 'user',
        permissions: [],
      },
      TEST_JWT_SECRET,
      { expiresIn: '-1s' },
    );

    const req = createMockRequest(`Bearer ${token}`);
    const res = createMockResponse();

    middleware.use(req, res, mockNext);

    // Expired tokens are silently ignored; guards handle 401
    expect(req.tenantId).toBeUndefined();
    expect(req.userId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('handles malformed JWT gracefully and calls next()', () => {
    const req = createMockRequest('Bearer not-a-valid-jwt');
    const res = createMockResponse();

    middleware.use(req, res, mockNext);

    expect(req.tenantId).toBeUndefined();
    expect(req.userId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('handles token signed with wrong secret gracefully', () => {
    const token = jwt.sign(
      {
        sub: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        role: 'user',
        permissions: [],
      },
      'wrong-secret',
      { expiresIn: '15m' },
    );

    const req = createMockRequest(`Bearer ${token}`);
    const res = createMockResponse();

    middleware.use(req, res, mockNext);

    expect(req.tenantId).toBeUndefined();
    expect(req.userId).toBeUndefined();
    expect(mockNext).toHaveBeenCalled();
  });

  it('uses dev-secret fallback when JWT_SECRET env var is not set', () => {
    delete process.env.JWT_SECRET;
    const newMiddleware = new TenantMiddleware();

    const token = jwt.sign(
      {
        sub: 'user-1',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        role: 'user',
        permissions: [],
      },
      'dev-secret',
      { expiresIn: '15m' },
    );

    const req = createMockRequest(`Bearer ${token}`);
    const res = createMockResponse();

    newMiddleware.use(req, res, mockNext);

    expect(req.tenantId).toBe('tenant-1');
    expect(req.userId).toBe('user-1');
    expect(mockNext).toHaveBeenCalled();

    // Restore
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });
});
