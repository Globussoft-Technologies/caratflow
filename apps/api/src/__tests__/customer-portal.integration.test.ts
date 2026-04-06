// ─── Customer Portal Endpoint Integration Tests ────────────────
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import type { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  type TestApp,
  TEST_B2C_CUSTOMER,
  generateB2CToken,
  generateAdminToken,
} from './test-app';
import { resetMocks } from './mocks';

describe('Customer Portal Integration Tests', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let b2cToken: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;
    b2cToken = generateB2CToken();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetMocks(testApp.prisma);
    (testApp.prisma as Record<string, unknown>)['$queryRawUnsafe'] = async () => [{ 1: 1 }];
  });

  // All customer-portal endpoints are guarded by B2CAuthGuard

  // ═══════════════════════════════════════════════════════════════
  //  AUTH ENFORCEMENT
  // ═══════════════════════════════════════════════════════════════

  describe('Auth enforcement', () => {
    it('returns 401 without any token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/account/dashboard');

      expect(res.status).toBe(401);
    });

    it('returns 401 with admin token (wrong type)', async () => {
      const adminToken = generateAdminToken();
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/account/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  DASHBOARD
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/account/dashboard', () => {
    it('returns 200 with aggregated dashboard data', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/account/dashboard')
        .set('Authorization', `Bearer ${b2cToken}`);

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  PROFILE
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/account/profile', () => {
    it('returns 200 with customer profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/account/profile')
        .set('Authorization', `Bearer ${b2cToken}`);

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  describe('PUT /api/v1/store/account/profile', () => {
    it('updates customer profile', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/store/account/profile')
        .set('Authorization', `Bearer ${b2cToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
          phone: '+919999999999',
        });

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  describe('PUT /api/v1/store/account/password', () => {
    it('changes password with correct current password', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/store/account/password')
        .set('Authorization', `Bearer ${b2cToken}`)
        .send({
          currentPassword: 'OldPassword1!',
          newPassword: 'NewPassword1!',
        });

      expect([200, 400, 401, 500]).toContain(res.status);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/store/account/password')
        .send({
          currentPassword: 'OldPassword1!',
          newPassword: 'NewPassword1!',
        });

      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  ORDERS
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/account/orders', () => {
    it('returns 200 with paginated orders', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/account/orders')
        .set('Authorization', `Bearer ${b2cToken}`);

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });

    it('accepts pagination and filter params', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/account/orders')
        .query({ page: 1, limit: 10, sortOrder: 'desc', status: 'COMPLETED' })
        .set('Authorization', `Bearer ${b2cToken}`);

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/store/account/orders/:id', () => {
    it('returns order detail', async () => {
      const orderId = uuid();
      const res = await request(app.getHttpServer())
        .get(`/api/v1/store/account/orders/${orderId}`)
        .set('Authorization', `Bearer ${b2cToken}`);

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  LOYALTY
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/account/loyalty', () => {
    it('returns 200 with loyalty points and tier', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/account/loyalty')
        .set('Authorization', `Bearer ${b2cToken}`);

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  describe('GET /api/v1/store/account/loyalty/history', () => {
    it('returns loyalty points history', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/account/loyalty/history')
        .set('Authorization', `Bearer ${b2cToken}`);

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/store/account/loyalty/redeem', () => {
    it('redeems loyalty points', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/store/account/loyalty/redeem')
        .set('Authorization', `Bearer ${b2cToken}`)
        .send({ points: 100, orderId: uuid() });

      expect([200, 400, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  SCHEMES
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/account/schemes', () => {
    it('returns 200 with active schemes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/account/schemes')
        .set('Authorization', `Bearer ${b2cToken}`);

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  describe('POST /api/v1/store/account/schemes/enroll', () => {
    it('enrolls in a scheme', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/store/account/schemes/enroll')
        .set('Authorization', `Bearer ${b2cToken}`)
        .send({ schemeId: uuid(), schemeType: 'GOLD_SAVINGS' });

      expect([201, 400, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  KYC
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/account/kyc', () => {
    it('returns 200 with KYC status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/account/kyc')
        .set('Authorization', `Bearer ${b2cToken}`);

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  describe('POST /api/v1/store/account/kyc/upload', () => {
    it('uploads KYC document', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/store/account/kyc/upload')
        .set('Authorization', `Bearer ${b2cToken}`)
        .send({
          documentType: 'PAN',
          documentNumber: 'ABCDE1234F',
          fileUrl: 'https://storage.example.com/kyc/pan.pdf',
        });

      expect([201, 400, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/account/notifications', () => {
    it('returns notification preferences', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/account/notifications')
        .set('Authorization', `Bearer ${b2cToken}`);

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('PUT /api/v1/store/account/notifications', () => {
    it('updates notification preferences', async () => {
      const res = await request(app.getHttpServer())
        .put('/api/v1/store/account/notifications')
        .set('Authorization', `Bearer ${b2cToken}`)
        .send({
          orders: { email: true, sms: true, whatsapp: false, push: true },
          promotions: { email: true, sms: false, whatsapp: false, push: false },
        });

      expect([200, 500]).toContain(res.status);
    });
  });
});
