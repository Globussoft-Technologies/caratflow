// ─── E2E Test Setup ────────────────────────────────────────────
// Supertest setup for end-to-end API testing.
// These tests require a running API server and database.

import * as jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

// ─── Configuration ──────────────────────────────────────────────

export const E2E_CONFIG = {
  apiUrl: process.env.API_URL ?? 'http://localhost:4000',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me-in-production',
  tenantSlug: 'test-e2e-store',
};

// ─── HTTP Client Helper ─────────────────────────────────────────
// Uses native fetch for E2E tests (no extra dependencies needed).

export interface ApiResponse<T = unknown> {
  status: number;
  body: {
    success: boolean;
    data?: T;
    error?: { code: string; message: string };
    meta?: Record<string, unknown>;
  };
}

export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  options: {
    body?: Record<string, unknown>;
    token?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<ApiResponse<T>> {
  const url = `${E2E_CONFIG.apiUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

// ─── Auth Helpers ───────────────────────────────────────────────

export function generateE2EToken(overrides: Partial<{
  sub: string;
  tenantId: string;
  email: string;
  role: string;
  permissions: string[];
}> = {}): string {
  return jwt.sign(
    {
      sub: overrides.sub ?? uuid(),
      tenantId: overrides.tenantId ?? uuid(),
      email: overrides.email ?? 'e2e-test@example.com',
      role: overrides.role ?? 'admin',
      permissions: overrides.permissions ?? ['*'],
    },
    E2E_CONFIG.jwtSecret,
    { expiresIn: '15m' },
  );
}

export async function loginAndGetToken(
  email: string,
  password: string,
  tenantSlug: string = E2E_CONFIG.tenantSlug,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await apiRequest('POST', '/api/v1/auth/login', {
    body: { email, password, tenantSlug },
  });

  if (response.status !== 200 || !response.body.data) {
    throw new Error(`Login failed: ${JSON.stringify(response.body)}`);
  }

  const data = response.body.data as { accessToken: string; refreshToken: string };
  return data;
}

// ─── Data Cleanup ───────────────────────────────────────────────
// In a real E2E suite, you would truncate test data between runs.
// This is a placeholder for test data management.

export async function cleanupTestData(tenantId: string): Promise<void> {
  // In a real implementation, this would delete all test data
  // for the given tenant from the database.
  // For now, each test should use unique IDs to avoid collisions.
  console.log(`[E2E] Cleanup for tenant ${tenantId} (placeholder)`);
}
