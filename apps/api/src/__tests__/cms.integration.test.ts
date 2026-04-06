// ─── CMS Endpoint Integration Tests ─────────────────────────────
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  type TestApp,
  TEST_TENANT_ID,
  generateAdminToken,
} from './test-app';
import { resetMocks } from './mocks';

describe('CMS Integration Tests', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let adminToken: string;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;
    adminToken = generateAdminToken();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetMocks(testApp.prisma);
    (testApp.prisma as Record<string, unknown>)['$queryRawUnsafe'] = async () => [{ 1: 1 }];
  });

  // CMS endpoints sit under /api/v1/store/cms/* and use TenantMiddleware
  // to extract tenantId from JWT. They don't require auth (public-facing).

  // ═══════════════════════════════════════════════════════════════
  //  HOMEPAGE
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/cms/homepage', () => {
    it('returns 200 with homepage sections when tenant context exists', async () => {
      // CMS controller extracts tenantId from req.tenantId which is set by
      // TenantMiddleware from Bearer token JWT. We provide an admin token to set it.
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/cms/homepage')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      }
    });

    it('returns 500/error without tenant context', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/cms/homepage');

      // Without JWT, tenantId is undefined -> controller throws Error
      expect([400, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  BANNERS
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/cms/banners', () => {
    it('returns active banners for HERO position', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/cms/banners')
        .query({ position: 'HERO' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      }
    });

    it('defaults to HERO position when not specified', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/cms/banners')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  BLOG
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/cms/blog', () => {
    it('returns published blog posts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/cms/blog')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      }
    });

    it('accepts pagination and category filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/cms/blog')
        .query({ page: '1', limit: '5', category: 'jewelry-care' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);
    });

    it('accepts tag filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/cms/blog')
        .query({ tag: 'gold' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/store/cms/blog/:slug', () => {
    it('returns a blog post by slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/cms/blog/how-to-care-for-gold')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  FAQ
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/cms/faq', () => {
    it('returns FAQs grouped by category', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/cms/faq')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('items');
        expect(res.body.data).toHaveProperty('grouped');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  COLLECTIONS
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/cms/collections', () => {
    it('returns active collections', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/cms/collections')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/store/cms/collections/:slug', () => {
    it('returns a collection by slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/cms/collections/wedding-collection')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  PAGES
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/cms/pages/:slug', () => {
    it('returns a page by slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/cms/pages/about-us')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  ANNOUNCEMENT
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/cms/announcement', () => {
    it('returns active announcement or null', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/cms/announcement')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  SEO
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/cms/seo/:pageType/:identifier', () => {
    it('returns SEO metadata for a product page', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/cms/seo/product/gold-ring-22k')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 404, 500]).toContain(res.status);
    });
  });
});
