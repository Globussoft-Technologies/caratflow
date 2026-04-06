// ─── Shared Mock Factories for Unit Tests ─────────────────────
// Provides mock PrismaService, EventBusService, and data factories.

import { vi } from 'vitest';
import { v4 as uuid } from 'uuid';

// ─── Tenant Context ────────────────────────────────────────────

export const mockTenantContext = {
  tenantId: 'test-tenant-id',
  userId: 'test-user-id',
};

export const TEST_TENANT = {
  id: 'test-tenant-id',
  name: 'Test Jewelry Store',
  slug: 'test-jewelry-store',
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const TEST_LOCATION = {
  id: 'test-location-id',
  tenantId: 'test-tenant-id',
  name: 'Main Showroom',
  city: 'Mumbai',
  state: 'MH',
  locationType: 'SHOWROOM',
};

// ─── Mock PrismaService ────────────────────────────────────────

export function createMockPrismaService() {
  const mockTx = createMockModels();
  const models = createMockModels();

  return {
    ...models,
    $transaction: vi.fn(async (fnOrArray: unknown) => {
      if (typeof fnOrArray === 'function') {
        return (fnOrArray as (tx: unknown) => Promise<unknown>)(mockTx);
      }
      // Array of promises
      if (Array.isArray(fnOrArray)) {
        return Promise.all(fnOrArray);
      }
      return fnOrArray;
    }),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    _tx: mockTx,
  };
}

function createMockModels() {
  return {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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
    customerAuth: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customerRefreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    otpVerification: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    stockItem: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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
    stockTransferItem: {
      update: vi.fn(),
    },
    stockTake: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    stockTakeItem: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    metalStock: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    stoneStock: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    batchLot: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    serialNumber: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
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
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    saleReturnItem: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    oldGoldPurchase: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    location: {
      findFirst: vi.fn(),
    },
    discount: {
      findFirst: vi.fn(),
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
    product: {
      findFirst: vi.fn(),
    },
  };
}

// ─── Mock EventBusService ──────────────────────────────────────

export function createMockEventBusService() {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
    publishedEvents: [] as Array<{ type: string; payload: unknown }>,
  };
}

export function capturePublishedEvents(mockEventBus: ReturnType<typeof createMockEventBusService>) {
  mockEventBus.publish.mockImplementation(async (event: { type: string; payload: unknown }) => {
    mockEventBus.publishedEvents.push(event);
  });
}

// ─── Data Factories ────────────────────────────────────────────

export function createMockProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    tenantId: mockTenantContext.tenantId,
    sku: 'GR-22K-001',
    name: '22K Gold Ring',
    productType: 'FINISHED_GOODS',
    costPricePaise: 500000n,
    sellingPricePaise: 650000n,
    metalWeightMg: 5000, // 5 grams
    metalPurity: 916, // 22K
    categoryId: 'cat-rings',
    category: { id: 'cat-rings', name: 'Rings' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockCustomer(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    tenantId: mockTenantContext.tenantId,
    firstName: 'Rajesh',
    lastName: 'Sharma',
    email: 'rajesh@example.com',
    phone: '+919876543210',
    state: 'MH',
    customerType: 'RETAIL',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockStockItem(overrides: Record<string, unknown> = {}) {
  const productId = (overrides.productId as string) ?? uuid();
  const locationId = (overrides.locationId as string) ?? 'test-location-id';
  return {
    id: uuid(),
    tenantId: mockTenantContext.tenantId,
    productId,
    locationId,
    quantityOnHand: 10,
    quantityReserved: 0,
    quantityOnOrder: 0,
    reorderLevel: 5,
    reorderQuantity: 10,
    lastCountedAt: null,
    binLocation: 'A1-01',
    createdAt: new Date(),
    updatedAt: new Date(),
    product: createMockProduct({ id: productId }),
    location: TEST_LOCATION,
    ...overrides,
  };
}

export function createMockSale(overrides: Record<string, unknown> = {}) {
  const saleId = (overrides.id as string) ?? uuid();
  return {
    id: saleId,
    tenantId: mockTenantContext.tenantId,
    saleNumber: 'SL/MUM/2604/0001',
    customerId: null,
    locationId: 'test-location-id',
    userId: mockTenantContext.userId,
    status: 'COMPLETED',
    subtotalPaise: 500000n,
    discountPaise: 0n,
    taxPaise: 15000n,
    totalPaise: 515000n,
    currencyCode: 'INR',
    roundOffPaise: 0n,
    notes: null,
    createdBy: mockTenantContext.userId,
    updatedBy: mockTenantContext.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    lineItems: [],
    payments: [],
    ...overrides,
  };
}

export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    tenantId: mockTenantContext.tenantId,
    email: 'user@example.com',
    passwordHash: '$2a$12$LJ3MdfMISf4mMS7xyDBLOOhiW1L4.FQghXpXLyC3dYhsIfj0bWX0e', // bcrypt hash of 'Password123!'
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    roleId: 'role-user',
    role: {
      id: 'role-user',
      name: 'user',
      permissions: { inventory: ['read', 'write'], retail: ['read'] },
    },
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockCustomerAuth(overrides: Record<string, unknown> = {}) {
  const customerId = (overrides.customerId as string) ?? uuid();
  return {
    id: uuid(),
    customerId,
    email: 'customer@example.com',
    phone: null,
    passwordHash: '$2a$12$LJ3MdfMISf4mMS7xyDBLOOhiW1L4.FQghXpXLyC3dYhsIfj0bWX0e',
    loginProvider: 'EMAIL',
    isEmailVerified: false,
    isPhoneVerified: false,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    lastLoginAt: null,
    customer: {
      id: customerId,
      tenantId: mockTenantContext.tenantId,
      firstName: 'Customer',
      lastName: 'Test',
    },
    ...overrides,
  };
}

// ─── Reset Helpers ─────────────────────────────────────────────

export function resetMocks(prisma: ReturnType<typeof createMockPrismaService>) {
  for (const [key, model] of Object.entries(prisma)) {
    if (key.startsWith('$') || key.startsWith('_')) continue;
    if (typeof model === 'object' && model !== null) {
      for (const fn of Object.values(model as Record<string, unknown>)) {
        if (typeof fn === 'function' && 'mockReset' in fn) {
          (fn as ReturnType<typeof vi.fn>).mockReset();
        }
      }
    }
  }
}
