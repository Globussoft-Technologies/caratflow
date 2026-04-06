// ─── Health Endpoint Integration Tests ─────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { createTestApp, type TestApp } from './test-app';

describe('GET /health', () => {
  let app: INestApplication;
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with status healthy when database is reachable', async () => {
    const res = await request(app.getHttpServer()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toBe('healthy');
  });

  it('includes database connectivity info in checks', async () => {
    const res = await request(app.getHttpServer()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('checks');
    expect(res.body.checks).toHaveProperty('database');
    expect(res.body.checks.database).toBe('ok');
  });

  it('includes a valid timestamp and version', async () => {
    const res = await request(app.getHttpServer()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('version');
    // Timestamp should be a valid ISO string
    expect(() => new Date(res.body.timestamp)).not.toThrow();
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('returns degraded when database check fails', async () => {
    // Make the DB query fail
    const prisma = testApp.prisma as Record<string, unknown>;
    const originalFn = prisma['$queryRawUnsafe'];
    (prisma as Record<string, unknown>)['$queryRawUnsafe'] = async () => {
      throw new Error('Connection refused');
    };

    const res = await request(app.getHttpServer()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.database).toBe('error');

    // Restore
    (prisma as Record<string, unknown>)['$queryRawUnsafe'] = originalFn;
  });
});
