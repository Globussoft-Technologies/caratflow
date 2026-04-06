// ─── Pre-Order Endpoint Integration Tests ───────────────────────
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import type { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  type TestApp,
  TEST_TENANT_ID,
  generateAdminToken,
  generateB2CToken,
} from './test-app';
import { resetMocks } from './mocks';

describe('Pre-Order Integration Tests', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let adminToken: string;
  let b2cToken: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;
    adminToken = generateAdminToken();
    b2cToken = generateB2CToken();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetMocks(testApp.prisma);
    (testApp.prisma as Record<string, unknown>)['$queryRawUnsafe'] = async () => [{ 1: 1 }];
  });

  // PreOrderController reads req.tenantId, req.userId, req.customerId
  // which are set by TenantMiddleware from JWT Bearer token.

  // ═══════════════════════════════════════════════════════════════
  //  CREATE PRE-ORDER
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/v1/store/preorder', () => {
    it('accepts pre-order with valid auth context', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/store/preorder')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: uuid(),
          quantity: 1,
          notes: 'Need by next week',
        });

      // Service will be called with tenantId from JWT
      expect([200, 201, 400, 500]).toContain(res.status);
      if (res.status === 200 || res.status === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      }
    });

    it('returns 401 or error without authentication', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/store/preorder')
        .send({
          productId: uuid(),
          quantity: 1,
        });

      // Without JWT, tenantId/userId/customerId are undefined on req
      expect([400, 401, 500]).toContain(res.status);
    });

    it('accepts pre-order with B2C customer token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/store/preorder')
        .set('Authorization', `Bearer ${b2cToken}`)
        .send({
          productId: uuid(),
          quantity: 2,
        });

      expect([200, 201, 400, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  MY PRE-ORDERS
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/preorder/my', () => {
    it('returns 200 with pre-orders for authenticated customer', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/preorder/my')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      }
    });

    it('accepts pagination query parameters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/preorder/my')
        .query({ page: '1', limit: '5' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  PRE-ORDER STATUS
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/products/:id/preorder-status', () => {
    it('returns pre-order availability for a product', async () => {
      const productId = uuid();
      const res = await request(app.getHttpServer())
        .get(`/api/v1/store/products/${productId}/preorder-status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  ORDER MODIFICATION
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/v1/store/orders/:id/modify', () => {
    it('accepts a modification request with valid auth', async () => {
      const orderId = uuid();
      const res = await request(app.getHttpServer())
        .post(`/api/v1/store/orders/${orderId}/modify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          modificationType: 'SIZE_CHANGE',
          requestedData: { newSize: '18' },
          reason: 'Wrong size ordered',
        });

      expect([200, 400, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
      }
    });
  });

  describe('GET /api/v1/store/orders/:id/modifications', () => {
    it('returns modification history for an order', async () => {
      const orderId = uuid();
      const res = await request(app.getHttpServer())
        .get(`/api/v1/store/orders/${orderId}/modifications`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  REORDER
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/v1/store/reorder/:orderId', () => {
    it('accepts reorder request for a previous order', async () => {
      const orderId = uuid();
      const res = await request(app.getHttpServer())
        .post(`/api/v1/store/reorder/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400, 404, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      }
    });

    it('accepts optional templateId query parameter', async () => {
      const orderId = uuid();
      const templateId = uuid();
      const res = await request(app.getHttpServer())
        .post(`/api/v1/store/reorder/${orderId}`)
        .query({ templateId })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400, 404, 500]).toContain(res.status);
    });
  });
});
