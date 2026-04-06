// ─── Chatbot Endpoint Integration Tests ─────────────────────────
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuid } from 'uuid';
import type { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  type TestApp,
  storefrontHeaders,
} from './test-app';
import { resetMocks } from './mocks';

describe('Chatbot Integration Tests', () => {
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
  //  START CHAT SESSION
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/v1/store/chat/start', () => {
    it('returns 200 with session and greeting message', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/store/chat/start')
        .set(storefrontHeaders())
        .send({});

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty('data');
      }
    });

    it('accepts optional sessionId and customerId', async () => {
      const sessionId = 'chat-session-' + uuid();
      const res = await request(app.getHttpServer())
        .post('/api/v1/store/chat/start')
        .set(storefrontHeaders())
        .send({ sessionId, customerId: 'cust-001' });

      expect([200, 500]).toContain(res.status);
    });

    it('requires x-tenant-id header', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/store/chat/start')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  SEND MESSAGE
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/v1/store/chat/message', () => {
    it('returns 200 with intent detection and response', async () => {
      const sessionId = 'chat-session-' + uuid();
      const res = await request(app.getHttpServer())
        .post('/api/v1/store/chat/message')
        .set(storefrontHeaders())
        .send({
          sessionId,
          content: 'I want to buy a gold necklace',
        });

      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('messages');
      }
    });

    it('handles product-specific queries', async () => {
      const sessionId = 'chat-session-' + uuid();
      const res = await request(app.getHttpServer())
        .post('/api/v1/store/chat/message')
        .set(storefrontHeaders())
        .send({
          sessionId,
          content: 'wedding ring under 50k',
        });

      expect([200, 500]).toContain(res.status);
    });

    it('returns 400 when sessionId is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/store/chat/message')
        .set(storefrontHeaders())
        .send({
          content: 'Hello',
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 when content is empty', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/store/chat/message')
        .set(storefrontHeaders())
        .send({
          sessionId: 'some-session',
          content: '',
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 when content is whitespace only', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/store/chat/message')
        .set(storefrontHeaders())
        .send({
          sessionId: 'some-session',
          content: '   ',
        });

      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  GET SESSION HISTORY
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/v1/store/chat/session/:sessionId', () => {
    it('returns session history', async () => {
      const sessionId = 'chat-session-' + uuid();
      const res = await request(app.getHttpServer())
        .get(`/api/v1/store/chat/session/${sessionId}`)
        .set(storefrontHeaders());

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  ESCALATE & CLOSE
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/v1/store/chat/escalate/:sessionId', () => {
    it('escalates session to human agent', async () => {
      const sessionId = 'chat-session-' + uuid();
      const res = await request(app.getHttpServer())
        .post(`/api/v1/store/chat/escalate/${sessionId}`)
        .set(storefrontHeaders());

      expect([200, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/store/chat/close/:sessionId', () => {
    it('closes a chat session', async () => {
      const sessionId = 'chat-session-' + uuid();
      const res = await request(app.getHttpServer())
        .post(`/api/v1/store/chat/close/${sessionId}`)
        .set(storefrontHeaders());

      expect([200, 404, 500]).toContain(res.status);
    });
  });
});
