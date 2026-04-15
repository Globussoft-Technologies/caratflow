import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmailService } from '../email.service';

type HeadersInit = Record<string, string>;

function mockResponse(status: number, headers: HeadersInit = {}, body = ''): Response {
  const headerMap = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (k: string) => headerMap.get(k.toLowerCase()) ?? null,
    },
    text: async () => body,
    json: async () => (body ? JSON.parse(body) : {}),
    clone() {
      return this;
    },
  } as unknown as Response;
}

function makePrisma(settings: Record<string, string>) {
  return {
    setting: {
      findMany: vi.fn(async () =>
        Object.entries(settings).map(([settingKey, value]) => ({ settingKey, settingValue: value })),
      ),
    },
  };
}

const goodSettings = {
  sendgrid_api_key: 'SG.test',
  sendgrid_from_email: 'noreply@caratflow.test',
  sendgrid_from_name: 'CaratFlow',
};

describe('EmailService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends an email via SendGrid and returns X-Message-Id', async () => {
    const prisma = makePrisma(goodSettings);
    fetchMock.mockResolvedValueOnce(mockResponse(202, { 'x-message-id': 'msg-123' }));
    const svc = new EmailService(prisma as never);
    const r = await svc.sendEmail('t1', { to: 'a@b.com', subject: 'Hi', html: '<b>hi</b>' });
    expect(r.success).toBe(true);
    expect(r.externalId).toBe('msg-123');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
    expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer SG.test');
    const payload = JSON.parse(opts.body as string);
    expect(payload.from.email).toBe('noreply@caratflow.test');
    expect(payload.personalizations[0].to[0].email).toBe('a@b.com');
    expect(payload.subject).toBe('Hi');
    expect(payload.content).toEqual(expect.arrayContaining([{ type: 'text/html', value: '<b>hi</b>' }]));
  });

  it('throws clear error when sendgrid_api_key setting is missing', async () => {
    const prisma = makePrisma({ sendgrid_from_email: 'f@x.com' });
    const svc = new EmailService(prisma as never);
    await expect(svc.sendEmail('t1', { to: 'a@b.com', subject: 'Hi', html: 'x' }))
      .rejects.toThrow(/sendgrid_api_key/);
  });

  it('throws when sendgrid_from_email setting is missing', async () => {
    const prisma = makePrisma({ sendgrid_api_key: 'SG.x' });
    const svc = new EmailService(prisma as never);
    await expect(svc.sendEmail('t1', { to: 'a@b.com', subject: 'Hi', html: 'x' }))
      .rejects.toThrow(/sendgrid_from_email/);
  });

  it('throws when neither html, text, nor templateId provided', async () => {
    const prisma = makePrisma(goodSettings);
    const svc = new EmailService(prisma as never);
    await expect(svc.sendEmail('t1', { to: 'a@b.com', subject: 'Hi' }))
      .rejects.toThrow(/html, text, templateId/);
  });

  it('retries on 500 then succeeds', async () => {
    const prisma = makePrisma(goodSettings);
    fetchMock
      .mockResolvedValueOnce(mockResponse(500, {}, 'boom'))
      .mockResolvedValueOnce(mockResponse(202, { 'x-message-id': 'msg-ok' }));
    const svc = new EmailService(prisma as never);
    const r = await svc.sendEmail('t1', { to: 'a@b.com', subject: 'Hi', html: 'x' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(r.externalId).toBe('msg-ok');
  });

  it('fails fast on 4xx without retrying', async () => {
    const prisma = makePrisma(goodSettings);
    fetchMock.mockResolvedValueOnce(mockResponse(401, {}, 'unauthorized'));
    const svc = new EmailService(prisma as never);
    await expect(svc.sendEmail('t1', { to: 'a@b.com', subject: 'Hi', html: 'x' }))
      .rejects.toThrow(/401/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after 3 retries on persistent 5xx', async () => {
    const prisma = makePrisma(goodSettings);
    fetchMock.mockResolvedValue(mockResponse(503, {}, 'down'));
    const svc = new EmailService(prisma as never);
    await expect(svc.sendEmail('t1', { to: 'a@b.com', subject: 'Hi', html: 'x' }))
      .rejects.toThrow(/503/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('passes attachments with base64 content and content-type', async () => {
    const prisma = makePrisma(goodSettings);
    fetchMock.mockResolvedValueOnce(mockResponse(202, { 'x-message-id': 'm1' }));
    const svc = new EmailService(prisma as never);
    await svc.sendEmail('t1', {
      to: 'a@b.com',
      subject: 'invoice',
      html: 'see attached',
      attachments: [{ content: 'BASE64DATA', filename: 'inv.pdf', type: 'application/pdf' }],
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.attachments[0]).toMatchObject({
      content: 'BASE64DATA',
      filename: 'inv.pdf',
      type: 'application/pdf',
      disposition: 'attachment',
    });
  });

  it('supports SendGrid dynamic template with templateId + dynamicTemplateData', async () => {
    const prisma = makePrisma(goodSettings);
    fetchMock.mockResolvedValueOnce(mockResponse(202, { 'x-message-id': 'm2' }));
    const svc = new EmailService(prisma as never);
    await svc.sendEmail('t1', {
      to: 'a@b.com',
      templateId: 'd-abc123',
      dynamicTemplateData: { firstName: 'Rajesh', amount: 5000 },
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.template_id).toBe('d-abc123');
    expect(body.personalizations[0].dynamic_template_data).toEqual({ firstName: 'Rajesh', amount: 5000 });
    expect(body.content).toBeUndefined();
  });

  it('supports raw html path (no template)', async () => {
    const prisma = makePrisma(goodSettings);
    fetchMock.mockResolvedValueOnce(mockResponse(202, { 'x-message-id': 'm3' }));
    const svc = new EmailService(prisma as never);
    await svc.sendEmail('t1', { to: 'a@b.com', subject: 'Raw', html: '<h1>ok</h1>' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.template_id).toBeUndefined();
    expect(body.content).toEqual([{ type: 'text/html', value: '<h1>ok</h1>' }]);
  });

  it('handles cc, bcc, and replyTo', async () => {
    const prisma = makePrisma(goodSettings);
    fetchMock.mockResolvedValueOnce(mockResponse(202, { 'x-message-id': 'm4' }));
    const svc = new EmailService(prisma as never);
    await svc.sendEmail('t1', {
      to: 'a@b.com',
      cc: ['c@b.com'],
      bcc: 'bcc@b.com',
      replyTo: 'reply@b.com',
      subject: 'Hi',
      html: 'x',
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.personalizations[0].cc).toEqual([{ email: 'c@b.com' }]);
    expect(body.personalizations[0].bcc).toEqual([{ email: 'bcc@b.com' }]);
    expect(body.reply_to).toEqual({ email: 'reply@b.com' });
  });
});
