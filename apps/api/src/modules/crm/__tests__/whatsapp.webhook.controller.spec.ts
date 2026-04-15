import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { WhatsAppWebhookController } from '../whatsapp.webhook.controller';

function makePrisma() {
  return {
    notificationLog: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
}

function sign(body: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

const SECRET = 'test-app-secret';
const VERIFY_TOKEN = 'test-verify-token';

describe('WhatsAppWebhookController', () => {
  let controller: WhatsAppWebhookController;
  let prisma: ReturnType<typeof makePrisma>;
  const origEnv = { ...process.env };

  beforeEach(() => {
    prisma = makePrisma();
    controller = new WhatsAppWebhookController(prisma as never);
    process.env.WHATSAPP_APP_SECRET = SECRET;
    process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN;
  });

  afterEach(() => {
    process.env = { ...origEnv };
    vi.restoreAllMocks();
  });

  // ─── GET verify challenge ────────────────────────────────────

  describe('verify (GET)', () => {
    it('echoes the challenge when verify_token matches', () => {
      expect(
        controller.verify('subscribe', VERIFY_TOKEN, 'challenge-123'),
      ).toBe('challenge-123');
    });

    it('throws UnauthorizedException for wrong token', () => {
      expect(() => controller.verify('subscribe', 'wrong', 'x')).toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when mode is not subscribe', () => {
      expect(() => controller.verify('unsubscribe', VERIFY_TOKEN, 'x')).toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── POST delivery status ────────────────────────────────────

  describe('handle (POST)', () => {
    function makeReq(raw: string) {
      return { rawBody: Buffer.from(raw, 'utf8') } as never;
    }

    const sentBody = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                statuses: [
                  {
                    id: 'wamid.ABC',
                    status: 'delivered',
                    timestamp: '1700000000',
                    recipient_id: '919876543210',
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    it('rejects when WHATSAPP_APP_SECRET is missing', async () => {
      delete process.env.WHATSAPP_APP_SECRET;
      const raw = JSON.stringify(sentBody);
      await expect(
        controller.handle(makeReq(raw), sign(raw, SECRET), sentBody as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when signature header is missing', async () => {
      const raw = JSON.stringify(sentBody);
      await expect(
        controller.handle(makeReq(raw), undefined, sentBody as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when signature is invalid', async () => {
      const raw = JSON.stringify(sentBody);
      await expect(
        controller.handle(makeReq(raw), 'sha256=deadbeef', sentBody as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects non-whatsapp objects', async () => {
      const bad = { object: 'page', entry: [] };
      const raw = JSON.stringify(bad);
      await expect(
        controller.handle(makeReq(raw), sign(raw, SECRET), bad as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates NotificationLog to DELIVERED on delivered status', async () => {
      prisma.notificationLog.findFirst.mockResolvedValue({ id: 'log-1' });
      prisma.notificationLog.update.mockResolvedValue({ id: 'log-1' });

      const raw = JSON.stringify(sentBody);
      const result = await controller.handle(
        makeReq(raw),
        sign(raw, SECRET),
        sentBody as never,
      );
      expect(result).toEqual({ success: true });

      expect(prisma.notificationLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'log-1' },
          data: expect.objectContaining({
            status: 'DELIVERED',
          }),
        }),
      );
    });

    it('updates NotificationLog to FAILED on failed status with error message', async () => {
      prisma.notificationLog.findFirst.mockResolvedValue({ id: 'log-2' });
      prisma.notificationLog.update.mockResolvedValue({ id: 'log-2' });

      const failedBody = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [
                    {
                      id: 'wamid.FAIL',
                      status: 'failed',
                      timestamp: '1700000001',
                      errors: [
                        { code: 131051, title: 'Unsupported message type', message: 'boom' },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const raw = JSON.stringify(failedBody);
      await controller.handle(makeReq(raw), sign(raw, SECRET), failedBody as never);

      const updateArgs = prisma.notificationLog.update.mock.calls[0][0];
      expect(updateArgs.data.status).toBe('FAILED');
      expect(updateArgs.data.failureReason).toBe('boom');
    });

    it('silently skips status updates when no matching log is found', async () => {
      prisma.notificationLog.findFirst.mockResolvedValue(null);
      const raw = JSON.stringify(sentBody);
      const result = await controller.handle(
        makeReq(raw),
        sign(raw, SECRET),
        sentBody as never,
      );
      expect(result).toEqual({ success: true });
      expect(prisma.notificationLog.update).not.toHaveBeenCalled();
    });
  });
});
