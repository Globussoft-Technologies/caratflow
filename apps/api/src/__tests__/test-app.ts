// ─── Integration Test App Factory ──────────────────────────────
// Creates a NestJS test module with mocked services for integration testing.
// Provides helpers for generating JWTs and making authenticated requests.

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../app.module';
import { PrismaService } from '../common/prisma.service';
import { vi } from 'vitest';
import * as jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { createMockPrismaService, createMockEventBusService } from './mocks';

// ─── Constants ────────────────────────────────────────────────────

export const JWT_SECRET = 'test-jwt-secret-for-caratflow-tests';

export const TEST_TENANT_ID = 'tenant-integration-test';
export const TEST_TENANT_SLUG = 'test-jewelry-store';

export const TEST_ADMIN_USER = {
  id: 'admin-user-001',
  tenantId: TEST_TENANT_ID,
  email: 'admin@teststore.com',
  role: 'admin',
};

export const TEST_B2C_CUSTOMER = {
  customerAuthId: 'cauth-001',
  customerId: 'cust-001',
  tenantId: TEST_TENANT_ID,
  email: 'customer@example.com',
  phone: '+919876543210',
};

// ─── Token Generators ─────────────────────────────────────────────

export function generateAdminToken(
  overrides: Partial<typeof TEST_ADMIN_USER> = {},
): string {
  const user = { ...TEST_ADMIN_USER, ...overrides };
  return jwt.sign(
    {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      permissions: ['*'],
    },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

export function generateB2CToken(
  overrides: Partial<typeof TEST_B2C_CUSTOMER> = {},
): string {
  const customer = { ...TEST_B2C_CUSTOMER, ...overrides };
  return jwt.sign(
    {
      sub: customer.customerAuthId,
      customerId: customer.customerId,
      tenantId: customer.tenantId,
      email: customer.email,
      phone: customer.phone,
      type: 'b2c',
    },
    JWT_SECRET,
    { expiresIn: '30m' },
  );
}

export function generateExpiredToken(): string {
  return jwt.sign(
    {
      sub: 'expired-user',
      tenantId: TEST_TENANT_ID,
      email: 'expired@test.com',
      role: 'admin',
      permissions: [],
    },
    JWT_SECRET,
    { expiresIn: '-1s' },
  );
}

// ─── App Factory ──────────────────────────────────────────────────

export interface TestApp {
  app: INestApplication;
  module: TestingModule;
  prisma: ReturnType<typeof createMockPrismaService>;
  eventBus: ReturnType<typeof createMockEventBusService>;
}

/**
 * Creates a lightweight NestJS app for integration tests.
 * Overrides PrismaService with mocks so no DB is needed.
 */
export async function createTestApp(): Promise<TestApp> {
  const mockPrisma = createMockPrismaService();
  const mockEventBus = createMockEventBusService();

  // Add $queryRawUnsafe for the health controller
  (mockPrisma as Record<string, unknown>)['$queryRawUnsafe'] = vi.fn().mockResolvedValue([{ 1: 1 }]);

  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  // Override PrismaService globally
  moduleBuilder.overrideProvider(PrismaService).useValue(mockPrisma);

  const module = await moduleBuilder.compile();
  const app = module.createNestApplication();

  // Apply the same global config as main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'trpc(.*)'],
  });

  await app.init();

  return { app, module, prisma: mockPrisma, eventBus: mockEventBus };
}

// ─── Request Helpers ──────────────────────────────────────────────

/** Standard headers for storefront endpoints (x-tenant-id based). */
export function storefrontHeaders(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    'x-tenant-id': TEST_TENANT_ID,
    'x-session-id': 'test-session-001',
    ...overrides,
  };
}

/** Storefront headers with customer context. */
export function authenticatedStorefrontHeaders(
  customerId: string = TEST_B2C_CUSTOMER.customerId,
): Record<string, string> {
  return {
    ...storefrontHeaders(),
    'x-customer-id': customerId,
  };
}
