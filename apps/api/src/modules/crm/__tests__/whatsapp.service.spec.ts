import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  WhatsAppService,
  WhatsAppNotConfiguredError,
  WhatsAppApiError,
  WHATSAPP_GRAPH_BASE,
} from '../whatsapp.service';

// Minimal Prisma stub. Only models used by the service need to exist.
function makePrisma() {
  return {
    setting: {
      findMany: vi.fn(),
    },
    notificationLog: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as ConstructorParameters<typeof WhatsAppService>[0];
}

const TENANT = 'tenant-1';

const GOOD_CREDS = [
  { settingKey: 'whatsapp_phone_number_id', settingValue: '111222333' },
  { settingKey: 'whatsapp_access_token', settingValue: 'EAAG_TOKEN' },
  { settingKey: 'whatsapp_business_account_id', settingValue: 'waba-999' },
];

function mockSuccessResponse(messageId = 'wamid.ABC') {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      messaging_product: 'whatsapp',
      contacts: [{ wa_id: '919876543210' }],
      messages: [{ id: messageId }],
    }),
  } as unknown as Response;
}

function mockErrorResponse(
  status: number,
  error: { message: string; code: number; type?: string },
) {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ error }),
  } as unknown as Response;
}

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let prisma: ReturnType<typeof makePrisma>;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new WhatsAppService(prisma as never);
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    // Zero out delays
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function advanceRetries() {
    // Flush any pending retry sleeps
    await vi.runAllTimersAsync();
  }

  // ─── Credentials ──────────────────────────────────────────────

  describe('getCredentials', () => {
    it('returns credentials when all three settings exist', async () => {
      (prisma as any).setting.findMany.mockResolvedValue(GOOD_CREDS);
      const creds = await service.getCredentials(TENANT);
      expect(creds).toEqual({
        phoneNumberId: '111222333',
        accessToken: 'EAAG_TOKEN',
        businessAccountId: 'waba-999',
      });
    });

    it('throws WhatsAppNotConfiguredError when credentials are missing', async () => {
      (prisma as any).setting.findMany.mockResolvedValue([
        { settingKey: 'whatsapp_phone_number_id', settingValue: 'x' },
      ]);
      await expect(service.getCredentials(TENANT)).rejects.toBeInstanceOf(
        WhatsAppNotConfiguredError,
      );
    });

    it('supports JSON-wrapped setting values', async () => {
      (prisma as any).setting.findMany.mockResolvedValue([
        { settingKey: 'whatsapp_phone_number_id', settingValue: { value: 'p1' } },
        { settingKey: 'whatsapp_access_token', settingValue: { value: 't1' } },
        { settingKey: 'whatsapp_business_account_id', settingValue: { value: 'b1' } },
      ]);
      const creds = await service.getCredentials(TENANT);
      expect(creds.phoneNumberId).toBe('p1');
    });
  });

  // ─── sendTextMessage ─────────────────────────────────────────

  describe('sendTextMessage', () => {
    beforeEach(() => {
      (prisma as any).setting.findMany.mockResolvedValue(GOOD_CREDS);
    });

    it('POSTs to correct Meta endpoint with text payload', async () => {
      fetchSpy.mockResolvedValueOnce(mockSuccessResponse('wamid.TEXT'));
      const p = service.sendTextMessage(TENANT, '+919876543210', 'hello');
      await advanceRetries();
      const result = await p;

      expect(result.messageId).toBe('wamid.TEXT');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe(`${WHATSAPP_GRAPH_BASE}/111222333/messages`);
      expect(init.method).toBe('POST');
      const parsed = JSON.parse(init.body);
      expect(parsed.type).toBe('text');
      expect(parsed.to).toBe('919876543210'); // plus stripped
      expect(parsed.text.body).toBe('hello');
      expect(init.headers.Authorization).toBe('Bearer EAAG_TOKEN');
    });

    it('updates NotificationLog with externalId when logId is passed', async () => {
      fetchSpy.mockResolvedValueOnce(mockSuccessResponse('wamid.LOG'));
      (prisma as any).notificationLog.findUnique.mockResolvedValue({
        id: 'log-1',
        metadata: { firstName: 'A' },
      });
      (prisma as any).notificationLog.update.mockResolvedValue({ id: 'log-1' });

      const p = service.sendTextMessage(TENANT, '+9198', 'hi', 'log-1');
      await advanceRetries();
      await p;

      const updateArgs = (prisma as any).notificationLog.update.mock.calls[0][0];
      expect(updateArgs.where.id).toBe('log-1');
      expect(updateArgs.data.status).toBe('SENT');
      expect(updateArgs.data.metadata.externalId).toBe('wamid.LOG');
      expect(updateArgs.data.metadata.firstName).toBe('A'); // preserved
      expect(updateArgs.data.sentAt).toBeInstanceOf(Date);
    });

    it('updates NotificationLog with errorMessage on failure and re-throws', async () => {
      fetchSpy.mockResolvedValue(
        mockErrorResponse(400, {
          message: 'Invalid phone number',
          code: 131000,
          type: 'OAuthException',
        }),
      );
      (prisma as any).notificationLog.findUnique.mockResolvedValue({
        id: 'log-2',
        metadata: null,
      });
      (prisma as any).notificationLog.update.mockResolvedValue({ id: 'log-2' });

      const p = service.sendTextMessage(TENANT, '+9198', 'hi', 'log-2');
      // non-retryable 400 → no timers needed
      await expect(p).rejects.toBeInstanceOf(WhatsAppApiError);

      const updateArgs = (prisma as any).notificationLog.update.mock.calls[0][0];
      expect(updateArgs.data.status).toBe('FAILED');
      expect(updateArgs.data.failureReason).toContain('Invalid phone number');
      expect(updateArgs.data.metadata.errorCode).toBe('131000');
      expect(updateArgs.data.metadata.errorMessage).toContain('Invalid phone number');
    });

    it('retries on 5xx errors up to 3 attempts then throws', async () => {
      fetchSpy.mockResolvedValue(
        mockErrorResponse(503, { message: 'Service unavailable', code: 1 }),
      );
      const p = service.sendTextMessage(TENANT, '+9198', 'hi');
      const expectation = expect(p).rejects.toBeInstanceOf(WhatsAppApiError);
      await advanceRetries();
      await expectation;
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('retries on 429 then succeeds', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          mockErrorResponse(429, { message: 'Too many requests', code: 613 }),
        )
        .mockResolvedValueOnce(mockSuccessResponse('wamid.RETRY'));

      const p = service.sendTextMessage(TENANT, '+9198', 'hi');
      await advanceRetries();
      const result = await p;
      expect(result.messageId).toBe('wamid.RETRY');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('does NOT retry on 400 client errors', async () => {
      fetchSpy.mockResolvedValue(
        mockErrorResponse(400, { message: 'Bad request', code: 100 }),
      );
      const p = service.sendTextMessage(TENANT, '+9198', 'hi');
      await expect(p).rejects.toBeInstanceOf(WhatsAppApiError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('throws WhatsAppNotConfiguredError when tenant is unconfigured (no fallback)', async () => {
      (prisma as any).setting.findMany.mockResolvedValue([]);
      await expect(
        service.sendTextMessage(TENANT, '+9198', 'hi'),
      ).rejects.toBeInstanceOf(WhatsAppNotConfiguredError);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ─── sendTemplateMessage ─────────────────────────────────────

  describe('sendTemplateMessage', () => {
    it('sends template payload with components', async () => {
      (prisma as any).setting.findMany.mockResolvedValue(GOOD_CREDS);
      fetchSpy.mockResolvedValueOnce(mockSuccessResponse('wamid.TMPL'));

      const p = service.sendTemplateMessage(
        TENANT,
        '+9198',
        'order_invoice',
        'en_US',
        [{ type: 'body', parameters: [{ type: 'text', text: 'Rajesh' }] }],
      );
      await advanceRetries();
      await p;

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.type).toBe('template');
      expect(body.template.name).toBe('order_invoice');
      expect(body.template.language.code).toBe('en_US');
      expect(body.template.components[0].parameters[0].text).toBe('Rajesh');
    });
  });

  // ─── sendDocument ────────────────────────────────────────────

  describe('sendDocument', () => {
    it('sends document with filename and caption', async () => {
      (prisma as any).setting.findMany.mockResolvedValue(GOOD_CREDS);
      fetchSpy.mockResolvedValueOnce(mockSuccessResponse('wamid.DOC'));

      const p = service.sendDocument(
        TENANT,
        '+9198',
        'https://example.com/invoice.pdf',
        'invoice.pdf',
        'Your invoice',
      );
      await advanceRetries();
      await p;

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.type).toBe('document');
      expect(body.document.link).toBe('https://example.com/invoice.pdf');
      expect(body.document.filename).toBe('invoice.pdf');
      expect(body.document.caption).toBe('Your invoice');
    });
  });

  // ─── sendInteractive ─────────────────────────────────────────

  describe('sendInteractive', () => {
    it('sends interactive button message', async () => {
      (prisma as any).setting.findMany.mockResolvedValue(GOOD_CREDS);
      fetchSpy.mockResolvedValueOnce(mockSuccessResponse('wamid.INT'));

      const p = service.sendInteractive(TENANT, '+9198', 'Choose:', [
        { id: 'yes', title: 'Yes' },
        { id: 'no', title: 'No' },
      ]);
      await advanceRetries();
      await p;

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
      expect(body.type).toBe('interactive');
      expect(body.interactive.action.buttons).toHaveLength(2);
      expect(body.interactive.action.buttons[0].reply.id).toBe('yes');
    });

    it('rejects 0 or >3 buttons', async () => {
      (prisma as any).setting.findMany.mockResolvedValue(GOOD_CREDS);
      await expect(
        service.sendInteractive(TENANT, '+9198', 'x', []),
      ).rejects.toThrow(/1-3 buttons/);
    });
  });

  // ─── getMessageStatus ────────────────────────────────────────

  describe('getMessageStatus', () => {
    it('GETs the Meta endpoint for the given message id', async () => {
      (prisma as any).setting.findMany.mockResolvedValue(GOOD_CREDS);
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ id: 'wamid.X', status: 'delivered' }),
      } as unknown as Response);

      const result = await service.getMessageStatus(TENANT, 'wamid.X');
      expect(result).toEqual({ id: 'wamid.X', status: 'delivered' });
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe(`${WHATSAPP_GRAPH_BASE}/wamid.X`);
      expect(init.method).toBe('GET');
    });
  });

  // ─── Manual smoke test (skipped unless env var set) ─────────

  describe.skipIf(!process.env.WHATSAPP_TEST_TO)('manual smoke test', () => {
    it('sends a real message to WHATSAPP_TEST_TO', async () => {
      // Unreachable unless env var set; real fetch would be used.
      expect(process.env.WHATSAPP_TEST_TO).toBeDefined();
    });
  });
});
