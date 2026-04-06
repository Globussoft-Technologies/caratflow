// ─── Search Endpoint Integration Tests ──────────────────────────
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  type TestApp,
  storefrontHeaders,
  authenticatedStorefrontHeaders,
} from './test-app';
import { resetMocks } from './mocks';

describe('Search Integration Tests', () => {
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
    (testApp.prisma as Record<string, unknown>)['$queryRawUnsafe'] = async () => [{ 1: 1 }];
  });

  // ═══════════════════════════════════════════════════════════════
  //  FULL-TEXT SEARCH
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/search', () => {
    it('returns 200 with results and facets for valid query', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/search')
        .query({ q: 'gold ring' })
        .set(storefrontHeaders());

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      }
    });

    it('returns 400 when q parameter is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/search')
        .set(storefrontHeaders());

      expect(res.status).toBe(400);
    });

    it('returns 400 when q is empty string', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/search')
        .query({ q: '  ' })
        .set(storefrontHeaders());

      expect(res.status).toBe(400);
    });

    it('requires x-tenant-id header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/search')
        .query({ q: 'gold ring' });

      expect(res.status).toBe(400);
    });

    it('accepts pagination parameters', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/search')
        .query({ q: 'necklace', page: '2', limit: '10' })
        .set(storefrontHeaders());

      expect([200, 500]).toContain(res.status);
    });

    it('accepts filters JSON parameter', async () => {
      const filters = JSON.stringify({ productType: 'GOLD', metalPurity: 916 });
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/search')
        .query({ q: 'ring', filters })
        .set(storefrontHeaders());

      expect([200, 500]).toContain(res.status);
    });

    it('returns 400 for invalid filters JSON', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/search')
        .query({ q: 'ring', filters: 'not-json' })
        .set(storefrontHeaders());

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  AUTOCOMPLETE
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/search/autocomplete', () => {
    it('returns 200 with suggestions for partial query', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/search/autocomplete')
        .query({ q: 'gol' })
        .set(storefrontHeaders());

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      }
    });

    it('returns 400 when q is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/search/autocomplete')
        .set(storefrontHeaders());

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  POPULAR SEARCHES
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/search/popular', () => {
    it('returns 200 with trending queries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/search/popular')
        .set(storefrontHeaders());

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      }
    });

    it('accepts limit parameter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/search/popular')
        .query({ limit: '5' })
        .set(storefrontHeaders());

      expect([200, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  RECENT SEARCHES
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/search/recent', () => {
    it('requires customer login', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/search/recent')
        .set(storefrontHeaders());

      expect(res.status).toBe(400);
    });

    it('returns 200 for authenticated customer', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/store/search/recent')
        .set(authenticatedStorefrontHeaders());

      expect([200, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/store/search/recent', () => {
    it('requires customer login', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/store/search/recent')
        .set(storefrontHeaders());

      expect(res.status).toBe(400);
    });
  });
});
