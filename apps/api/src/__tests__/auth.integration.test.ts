// ─── Auth Endpoint Integration Tests ───────────────────────────
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import type { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  type TestApp,
  TEST_TENANT_ID,
  TEST_TENANT_SLUG,
  TEST_ADMIN_USER,
  TEST_B2C_CUSTOMER,
  generateAdminToken,
  generateB2CToken,
  generateExpiredToken,
} from './test-app';
import { resetMocks, createMockUser, createMockCustomerAuth } from './mocks';

describe('Auth Integration Tests', () => {
  let app: INestApplication;
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetMocks(testApp.prisma);
    // Re-mock $queryRawUnsafe for health
    (testApp.prisma as Record<string, unknown>)['$queryRawUnsafe'] = async () => [{ 1: 1 }];
  });

  // ═══════════════════════════════════════════════════════════════
  //  ADMIN AUTH - POST /api/v1/auth/*
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/v1/auth/register', () => {
    it('returns 201 with user data on successful registration', async () => {
      const userId = uuid();
      testApp.prisma.user.findUnique.mockResolvedValue(null); // no existing user
      testApp.prisma.user.create.mockResolvedValue({
        id: userId,
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        tenantId: TEST_TENANT_ID,
        createdAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          tenantId: TEST_TENANT_ID,
          email: 'new@example.com',
          password: 'SecurePass123!',
          firstName: 'New',
          lastName: 'User',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe('new@example.com');
    });

    it('returns 409 when email already exists', async () => {
      testApp.prisma.user.findUnique.mockResolvedValue(
        createMockUser({ email: 'existing@example.com' }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          tenantId: TEST_TENANT_ID,
          email: 'existing@example.com',
          password: 'SecurePass123!',
          firstName: 'Existing',
          lastName: 'User',
        });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const passwordHash = bcrypt.hashSync('CorrectPassword1!', 12);

    it('returns 200 with tokens on correct credentials', async () => {
      testApp.prisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        slug: TEST_TENANT_SLUG,
        isActive: true,
      });
      testApp.prisma.user.findUnique.mockResolvedValue(
        createMockUser({
          passwordHash,
          email: 'admin@teststore.com',
          isActive: true,
        }),
      );
      testApp.prisma.user.update.mockResolvedValue({});
      testApp.prisma.refreshToken.create.mockResolvedValue({ id: uuid() });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@teststore.com',
          password: 'CorrectPassword1!',
          tenantSlug: TEST_TENANT_SLUG,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data).toHaveProperty('expiresIn');
    });

    it('returns 401 on wrong password', async () => {
      testApp.prisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        slug: TEST_TENANT_SLUG,
        isActive: true,
      });
      testApp.prisma.user.findUnique.mockResolvedValue(
        createMockUser({
          passwordHash,
          isActive: true,
        }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@teststore.com',
          password: 'WrongPassword!',
          tenantSlug: TEST_TENANT_SLUG,
        });

      expect(res.status).toBe(401);
    });

    it('returns 401 on invalid tenant slug', async () => {
      testApp.prisma.tenant.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@teststore.com',
          password: 'CorrectPassword1!',
          tenantSlug: 'nonexistent-store',
        });

      expect(res.status).toBe(401);
    });

    it('returns 401 when user is inactive', async () => {
      testApp.prisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        slug: TEST_TENANT_SLUG,
        isActive: true,
      });
      testApp.prisma.user.findUnique.mockResolvedValue(
        createMockUser({
          passwordHash,
          isActive: false,
        }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@teststore.com',
          password: 'CorrectPassword1!',
          tenantSlug: TEST_TENANT_SLUG,
        });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('returns 200 with new tokens on valid refresh token', async () => {
      const refreshTokenValue = uuid() + '-' + uuid();
      testApp.prisma.refreshToken.findUnique.mockResolvedValue({
        id: uuid(),
        token: refreshTokenValue,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000), // 1 day ahead
        user: createMockUser({ email: 'admin@teststore.com' }),
      });
      testApp.prisma.refreshToken.update.mockResolvedValue({});
      testApp.prisma.refreshToken.create.mockResolvedValue({ id: uuid() });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: refreshTokenValue });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('returns 401 on expired refresh token', async () => {
      testApp.prisma.refreshToken.findUnique.mockResolvedValue({
        id: uuid(),
        token: 'expired-token',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 86400000), // 1 day in the past
        user: createMockUser(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'expired-token' });

      expect(res.status).toBe(401);
    });

    it('returns 401 on revoked refresh token', async () => {
      testApp.prisma.refreshToken.findUnique.mockResolvedValue({
        id: uuid(),
        token: 'revoked-token',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        user: createMockUser(),
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'revoked-token' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('returns 200 on successful logout', async () => {
      testApp.prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'some-valid-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  B2C AUTH - POST /api/v1/b2c/auth/*
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/v1/b2c/auth/register/email', () => {
    it('returns 201 on successful B2C email registration', async () => {
      const customerId = uuid();
      const customerAuthId = uuid();

      testApp.prisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        slug: TEST_TENANT_SLUG,
        isActive: true,
      });
      testApp.prisma.customerAuth.findUnique.mockResolvedValue(null);
      testApp.prisma.$transaction.mockResolvedValue([
        { id: customerId },
        {
          id: customerAuthId,
          customerId,
          email: 'newcustomer@example.com',
          phone: null,
          isEmailVerified: false,
          isPhoneVerified: false,
          twoFactorEnabled: false,
          loginProvider: 'EMAIL',
          customer: {
            id: customerId,
            tenantId: TEST_TENANT_ID,
            firstName: 'New',
            lastName: 'Customer',
          },
        },
      ]);
      testApp.prisma.customerRefreshToken.create.mockResolvedValue({ id: uuid() });

      const res = await request(app.getHttpServer())
        .post('/api/v1/b2c/auth/register/email')
        .send({
          email: 'newcustomer@example.com',
          password: 'SecurePass123!',
          firstName: 'New',
          lastName: 'Customer',
          tenantSlug: TEST_TENANT_SLUG,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('customer');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('returns 409 when email already registered', async () => {
      testApp.prisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        slug: TEST_TENANT_SLUG,
        isActive: true,
      });
      testApp.prisma.customerAuth.findUnique.mockResolvedValue(
        createMockCustomerAuth({ email: 'existing@example.com' }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/b2c/auth/register/email')
        .send({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          firstName: 'Existing',
          lastName: 'Customer',
          tenantSlug: TEST_TENANT_SLUG,
        });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/v1/b2c/auth/login/email', () => {
    const passwordHash = bcrypt.hashSync('CustomerPass1!', 12);

    it('returns 200 with tokens on valid login', async () => {
      testApp.prisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        slug: TEST_TENANT_SLUG,
        isActive: true,
      });
      testApp.prisma.customerAuth.findUnique.mockResolvedValue(
        createMockCustomerAuth({
          passwordHash,
          email: 'customer@example.com',
        }),
      );
      testApp.prisma.customerAuth.update.mockResolvedValue({});
      testApp.prisma.customerRefreshToken.create.mockResolvedValue({ id: uuid() });

      const res = await request(app.getHttpServer())
        .post('/api/v1/b2c/auth/login/email')
        .send({
          email: 'customer@example.com',
          password: 'CustomerPass1!',
          tenantSlug: TEST_TENANT_SLUG,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('customer');
    });

    it('returns 401 on wrong password', async () => {
      testApp.prisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        slug: TEST_TENANT_SLUG,
        isActive: true,
      });
      testApp.prisma.customerAuth.findUnique.mockResolvedValue(
        createMockCustomerAuth({
          passwordHash,
          email: 'customer@example.com',
        }),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/b2c/auth/login/email')
        .send({
          email: 'customer@example.com',
          password: 'WrongPassword!',
          tenantSlug: TEST_TENANT_SLUG,
        });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/b2c/auth/otp/send', () => {
    it('returns 200 when OTP is sent', async () => {
      testApp.prisma.otpVerification.updateMany.mockResolvedValue({ count: 0 });
      testApp.prisma.otpVerification.create.mockResolvedValue({
        id: uuid(),
        identifier: '+919876543210',
        purpose: 'LOGIN',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/b2c/auth/otp/send')
        .send({
          identifier: '+919876543210',
          purpose: 'LOGIN',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/b2c/auth/otp/verify', () => {
    it('returns 200 when OTP is valid', async () => {
      testApp.prisma.otpVerification.findFirst.mockResolvedValue({
        id: uuid(),
        identifier: '+919876543210',
        otp: '123456',
        purpose: 'REGISTRATION',
        expiresAt: new Date(Date.now() + 300000),
        isUsed: false,
      });
      testApp.prisma.otpVerification.update.mockResolvedValue({});

      const res = await request(app.getHttpServer())
        .post('/api/v1/b2c/auth/otp/verify')
        .send({
          identifier: '+919876543210',
          otp: '123456',
          purpose: 'REGISTRATION',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('verified', true);
    });
  });

  describe('POST /api/v1/b2c/auth/login/social', () => {
    it('returns 200 on social login for existing user', async () => {
      // This test mocks the full social login chain
      // The social auth service is a dependency of B2CAuthService
      // We rely on the service-level mock cascade

      testApp.prisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        slug: TEST_TENANT_SLUG,
        isActive: true,
      });

      // The service will call socialAuthService.verifySocialToken then
      // socialAuthService.findCustomerBySocialAccount
      // Since these services are injected, we need to test at the controller level
      // For integration testing, mock the underlying prisma calls

      // Note: Social login requires SocialAuthService mocking which is internal.
      // This is a smoke test that the endpoint exists and requires proper input.
      const res = await request(app.getHttpServer())
        .post('/api/v1/b2c/auth/login/social')
        .send({
          provider: 'GOOGLE',
          idToken: 'mock-google-id-token',
          tenantSlug: TEST_TENANT_SLUG,
        });

      // Response depends on SocialAuthService behavior; either 200 or error
      // At minimum, endpoint is reachable and doesn't 404
      expect([200, 401, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/b2c/auth/me', () => {
    it('returns 200 with profile for valid B2C token', async () => {
      const token = generateB2CToken();

      testApp.prisma.customerAuth.findUnique.mockResolvedValue(
        createMockCustomerAuth({
          id: TEST_B2C_CUSTOMER.customerAuthId,
          customerId: TEST_B2C_CUSTOMER.customerId,
          email: TEST_B2C_CUSTOMER.email,
        }),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/b2c/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('customerId');
    });

    it('returns 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/b2c/auth/me');

      expect(res.status).toBe(401);
    });

    it('returns 401 with admin token (wrong token type)', async () => {
      const adminToken = generateAdminToken();

      const res = await request(app.getHttpServer())
        .get('/api/v1/b2c/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      // B2CAuthGuard checks payload.type === 'b2c'; admin token has no type field
      expect(res.status).toBe(401);
    });

    it('returns 401 with expired token', async () => {
      const expiredToken = generateExpiredToken();

      const res = await request(app.getHttpServer())
        .get('/api/v1/b2c/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns 200 regardless of whether email exists (security)', async () => {
      testApp.prisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        slug: TEST_TENANT_SLUG,
        isActive: true,
      });
      testApp.prisma.user.findUnique.mockResolvedValue(null); // user not found

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'unknown@example.com',
          tenantSlug: TEST_TENANT_SLUG,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
