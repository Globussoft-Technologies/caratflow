import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SmsService } from '../sms.service';

function mockResponse(status: number, body: unknown = {}): Response {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    text: async () => bodyStr,
    json: async () => (typeof body === 'string' ? body : body),
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

const MSG91_SETTINGS = {
  sms_provider: 'MSG91',
  msg91_auth_key: 'authkey-123',
  msg91_sender_id: 'CRTFLW',
  msg91_flow_id: 'flow-abc',
};

const TWILIO_SETTINGS = {
  sms_provider: 'TWILIO',
  twilio_account_sid: 'ACxxxxxx',
  twilio_auth_token: 'tok-secret',
  twilio_from_number: '+15550001234',
};

describe('SmsService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to MSG91 when sms_provider setting is absent', async () => {
    const prisma = makePrisma({
      msg91_auth_key: 'k',
      msg91_sender_id: 's',
      msg91_flow_id: 'f',
    });
    fetchMock.mockResolvedValueOnce(mockResponse(200, { request_id: 'r1' }));
    const svc = new SmsService(prisma as never);
    const r = await svc.sendSms('t1', { to: '+919812345678', body: 'hi' });
    expect(r.provider).toBe('MSG91');
  });

  it('sends via MSG91 with correct URL, authkey header, and payload', async () => {
    const prisma = makePrisma(MSG91_SETTINGS);
    fetchMock.mockResolvedValueOnce(mockResponse(200, { request_id: 'req-1' }));
    const svc = new SmsService(prisma as never);
    const r = await svc.sendSms('t1', { to: '+919812345678', body: 'hello' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.msg91.com/api/v5/flow/');
    expect((opts.headers as Record<string, string>).authkey).toBe('authkey-123');
    const body = JSON.parse(opts.body as string);
    expect(body.template_id).toBe('flow-abc');
    expect(body.sender).toBe('CRTFLW');
    expect(body.recipients[0].mobiles).toBe('919812345678'); // "+" stripped
    expect(r.externalId).toBe('req-1');
  });

  it('passes templateId override to MSG91 when provided', async () => {
    const prisma = makePrisma(MSG91_SETTINGS);
    fetchMock.mockResolvedValueOnce(mockResponse(200, { request_id: 'r2' }));
    const svc = new SmsService(prisma as never);
    await svc.sendSms('t1', {
      to: '+919812345678',
      body: 'hi',
      templateId: 'otp-flow',
      templateVars: { otp: '1234' },
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.template_id).toBe('otp-flow');
    expect(body.recipients[0].otp).toBe('1234');
  });

  it('sends via Twilio with Basic auth + form encoding', async () => {
    const prisma = makePrisma(TWILIO_SETTINGS);
    fetchMock.mockResolvedValueOnce(mockResponse(201, { sid: 'SMxxxx' }));
    const svc = new SmsService(prisma as never);
    const r = await svc.sendSms('t1', { to: '+15551237890', body: 'hey' });
    expect(r.provider).toBe('TWILIO');
    expect(r.externalId).toBe('SMxxxx');
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/ACxxxxxx/Messages.json');
    const auth = (opts.headers as Record<string, string>).Authorization;
    expect(auth).toMatch(/^Basic /);
    const decoded = Buffer.from(auth.replace('Basic ', ''), 'base64').toString('utf-8');
    expect(decoded).toBe('ACxxxxxx:tok-secret');
    expect(opts.body).toContain('To=%2B15551237890');
    expect(opts.body).toContain('From=%2B15550001234');
    expect(opts.body).toContain('Body=hey');
  });

  it('switches provider based on tenant config', async () => {
    const prismaA = makePrisma(MSG91_SETTINGS);
    const prismaB = makePrisma(TWILIO_SETTINGS);
    fetchMock
      .mockResolvedValueOnce(mockResponse(200, { request_id: 'rA' }))
      .mockResolvedValueOnce(mockResponse(201, { sid: 'rB' }));
    const svcA = new SmsService(prismaA as never);
    const svcB = new SmsService(prismaB as never);
    const a = await svcA.sendSms('ta', { to: '+911111111111', body: 'x' });
    const b = await svcB.sendSms('tb', { to: '+12223334444', body: 'x' });
    expect(a.provider).toBe('MSG91');
    expect(b.provider).toBe('TWILIO');
  });

  it('retries MSG91 on 500 then succeeds', async () => {
    const prisma = makePrisma(MSG91_SETTINGS);
    fetchMock
      .mockResolvedValueOnce(mockResponse(500, 'boom'))
      .mockResolvedValueOnce(mockResponse(200, { request_id: 'ok' }));
    const svc = new SmsService(prisma as never);
    const r = await svc.sendSms('t1', { to: '+919812345678', body: 'hi' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(r.externalId).toBe('ok');
  });

  it('retries Twilio on 429 then fails after 3 attempts', async () => {
    const prisma = makePrisma(TWILIO_SETTINGS);
    fetchMock.mockResolvedValue(mockResponse(429, 'rate'));
    const svc = new SmsService(prisma as never);
    await expect(svc.sendSms('t1', { to: '+15551237890', body: 'x' }))
      .rejects.toThrow(/429/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('fails fast on 4xx from MSG91', async () => {
    const prisma = makePrisma(MSG91_SETTINGS);
    fetchMock.mockResolvedValueOnce(mockResponse(400, 'bad'));
    const svc = new SmsService(prisma as never);
    await expect(svc.sendSms('t1', { to: '+919812345678', body: 'x' }))
      .rejects.toThrow(/400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws when MSG91 config is missing msg91_auth_key', async () => {
    const prisma = makePrisma({
      sms_provider: 'MSG91',
      msg91_sender_id: 'X',
      msg91_flow_id: 'F',
    });
    const svc = new SmsService(prisma as never);
    await expect(svc.sendSms('t1', { to: '+919812345678', body: 'x' }))
      .rejects.toThrow(/msg91_auth_key/);
  });

  it('throws when Twilio config is missing twilio_auth_token', async () => {
    const prisma = makePrisma({
      sms_provider: 'TWILIO',
      twilio_account_sid: 'ACx',
      twilio_from_number: '+1555',
    });
    const svc = new SmsService(prisma as never);
    await expect(svc.sendSms('t1', { to: '+15551237890', body: 'x' }))
      .rejects.toThrow(/twilio_auth_token/);
  });

  it('throws when "to" is empty', async () => {
    const prisma = makePrisma(MSG91_SETTINGS);
    const svc = new SmsService(prisma as never);
    await expect(svc.sendSms('t1', { to: '', body: 'x' }))
      .rejects.toThrow(/"to" is required/);
  });

  it('throws when neither body nor templateId is provided', async () => {
    const prisma = makePrisma(MSG91_SETTINGS);
    const svc = new SmsService(prisma as never);
    await expect(svc.sendSms('t1', { to: '+919812345678', body: '' }))
      .rejects.toThrow(/body, templateId/);
  });
});
