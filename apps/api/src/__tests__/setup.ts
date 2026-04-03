// ─── Test Setup ────────────────────────────────────────────────
// Integration test helpers: test database, Prisma client, JWT tokens, cleanup.

import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import * as jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

// ─── Test Environment Variables ─────────────────────────────────

const TEST_JWT_SECRET = 'test-jwt-secret-for-caratflow-tests';
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.NODE_ENV = 'test';

// Use a separate test database if available, otherwise fall back to dev
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'mysql://caratflow:caratflow_pass@localhost:3306/caratflow_test';
}

// ─── Test Tenant & User ─────────────────────────────────────────

export const TEST_TENANT_ID = 'test-tenant-' + uuid().slice(0, 8);
export const TEST_USER_ID = 'test-user-' + uuid().slice(0, 8);
export const TEST_ADMIN_ID = 'test-admin-' + uuid().slice(0, 8);

export const TEST_TENANT = {
  id: TEST_TENANT_ID,
  name: 'Test Jewelry Store',
  slug: 'test-jewelry-store',
  isActive: true,
};

export const TEST_USER = {
  id: TEST_USER_ID,
  tenantId: TEST_TENANT_ID,
  email: 'testuser@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
};

export const TEST_ADMIN = {
  id: TEST_ADMIN_ID,
  tenantId: TEST_TENANT_ID,
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
};

// ─── JWT Token Generation ───────────────────────────────────────

interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  role: string;
  permissions: string[];
}

export function generateTestToken(
  user: { id: string; tenantId: string; email: string; role: string },
  permissions: string[] = ['*'],
): string {
  const payload: JwtPayload = {
    sub: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role,
    permissions,
  };

  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '15m' });
}

export function generateExpiredToken(
  user: { id: string; tenantId: string; email: string; role: string },
): string {
  const payload: JwtPayload = {
    sub: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role,
    permissions: [],
  };

  return jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '-1s' });
}

export const TEST_TOKEN = generateTestToken(TEST_USER);
export const ADMIN_TOKEN = generateTestToken(TEST_ADMIN, ['*']);

// ─── Mock Prisma Client ─────────────────────────────────────────
// For unit tests, use this mock. Integration tests should use the real Prisma client.

export function createMockPrismaService() {
  return {
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    stockItem: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    stockMovement: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    stockTransfer: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    stockTake: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    stockTakeItem: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    sale: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    saleLineItem: {
      create: vi.fn(),
    },
    salePayment: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    saleReturn: {
      count: vi.fn(),
    },
    repairOrder: {
      count: vi.fn(),
    },
    customOrder: {
      count: vi.fn(),
    },
    layaway: {
      count: vi.fn(),
    },
    location: {
      findFirst: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
    },
    discount: {
      findFirst: vi.fn(),
    },
    journalEntry: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    journalEntryLine: {
      findMany: vi.fn(),
    },
    invoice: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    taxTransaction: {
      createMany: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    product: {
      findFirst: vi.fn(),
    },
    billOfMaterials: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    bomItem: {
      deleteMany: vi.fn(),
    },
    jobOrder: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    jobOrderItem: {
      createMany: vi.fn(),
    },
  };
}

const mockPrisma = createMockPrismaService();

// ─── Mock Event Bus ─────────────────────────────────────────────

export function createMockEventBus() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
  };
}

// ─── Cleanup Helper ─────────────────────────────────────────────

export function resetAllMocks(...mocks: Array<ReturnType<typeof createMockPrismaService>>) {
  for (const mock of mocks) {
    for (const [, model] of Object.entries(mock)) {
      if (typeof model === 'object' && model !== null) {
        for (const [, fn] of Object.entries(model as Record<string, unknown>)) {
          if (typeof fn === 'function' && 'mockReset' in fn) {
            (fn as ReturnType<typeof vi.fn>).mockReset();
          }
        }
      }
    }
  }
}
