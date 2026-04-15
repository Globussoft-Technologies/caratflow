import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CashfreeKycProvider,
  loadCashfreeConfigFromEnv,
} from '../cashfree.provider';

function mockFetch(
  handler: (url: string, init: RequestInit) => Promise<Response> | Response,
): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async (url: string, init: RequestInit) => handler(url, init));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = fn;
  return fn;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('CashfreeKycProvider', () => {
  const config = {
    clientId: 'test-client',
    clientSecret: 'test-secret',
    baseUrl: 'https://sandbox.cashfree.com',
  };
  let provider: CashfreeKycProvider;

  beforeEach(() => {
    provider = new CashfreeKycProvider(config);
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).fetch;
  });

  // ─── loadCashfreeConfigFromEnv ────────────────────────────────

  describe('loadCashfreeConfigFromEnv', () => {
    const origEnv = { ...process.env };
    afterEach(() => {
      process.env = { ...origEnv };
    });

    it('returns null when creds missing', () => {
      delete process.env.CASHFREE_VERIFY_CLIENT_ID;
      delete process.env.CASHFREE_VERIFY_CLIENT_SECRET;
      expect(loadCashfreeConfigFromEnv()).toBeNull();
    });

    it('returns config with sandbox default when creds set', () => {
      process.env.CASHFREE_VERIFY_CLIENT_ID = 'id';
      process.env.CASHFREE_VERIFY_CLIENT_SECRET = 'secret';
      delete process.env.CASHFREE_VERIFY_BASE_URL;
      const cfg = loadCashfreeConfigFromEnv();
      expect(cfg).toEqual({
        clientId: 'id',
        clientSecret: 'secret',
        baseUrl: 'https://sandbox.cashfree.com',
      });
    });

    it('honors CASHFREE_VERIFY_BASE_URL override for production', () => {
      process.env.CASHFREE_VERIFY_CLIENT_ID = 'id';
      process.env.CASHFREE_VERIFY_CLIENT_SECRET = 'secret';
      process.env.CASHFREE_VERIFY_BASE_URL = 'https://api.cashfree.com';
      const cfg = loadCashfreeConfigFromEnv();
      expect(cfg?.baseUrl).toBe('https://api.cashfree.com');
    });
  });

  // ─── verifyAadhaar ────────────────────────────────────────────

  it('verifyAadhaar returns verified=true on successful response', async () => {
    const fetchSpy = mockFetch(async () =>
      jsonResponse({ status: 'VALID', name: 'Ravi', dob: '1990-01-01' }),
    );
    const result = await provider.verifyAadhaar('123456789012', 'Ravi');
    expect(result.verified).toBe(true);
    expect(result.name).toBe('Ravi');
    expect(result.source).toBe('cashfree');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://sandbox.cashfree.com/verification/aadhaar',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-client-id': 'test-client',
          'x-client-secret': 'test-secret',
        }),
      }),
    );
  });

  it('verifyAadhaar returns DEMOGRAPHIC_NOT_AVAILABLE on 404', async () => {
    mockFetch(async () => jsonResponse({ message: 'not found' }, 404));
    const result = await provider.verifyAadhaar('123456789012');
    expect(result.verified).toBe(false);
    expect(result.errorCode).toBe('DEMOGRAPHIC_NOT_AVAILABLE');
  });

  it('verifyAadhaar maps 401 to UNAUTHORIZED', async () => {
    mockFetch(async () => jsonResponse({ message: 'bad creds' }, 401));
    const result = await provider.verifyAadhaar('123456789012');
    expect(result.verified).toBe(false);
    expect(result.errorCode).toBe('UNAUTHORIZED');
  });

  it('verifyAadhaar returns verified=false with NOT_VERIFIED when provider says invalid', async () => {
    mockFetch(async () => jsonResponse({ status: 'INVALID', message: 'mismatch' }));
    const result = await provider.verifyAadhaar('123456789012');
    expect(result.verified).toBe(false);
    expect(result.errorCode).toBe('NOT_VERIFIED');
    expect(result.errorMessage).toBe('mismatch');
  });

  // ─── verifyPan ────────────────────────────────────────────────

  it('verifyPan returns verified=true', async () => {
    mockFetch(async () => jsonResponse({ status: 'VALID', registered_name: 'RAVI KUMAR' }));
    const result = await provider.verifyPan('ABCDE1234F', 'Ravi Kumar');
    expect(result.verified).toBe(true);
    expect(result.name).toBe('RAVI KUMAR');
  });

  it('verifyPan maps 422 to INVALID_INPUT', async () => {
    mockFetch(async () => jsonResponse({ message: 'bad pan' }, 422));
    const result = await provider.verifyPan('BADPAN');
    expect(result.verified).toBe(false);
    expect(result.errorCode).toBe('INVALID_INPUT');
  });

  // ─── OTP flow ─────────────────────────────────────────────────

  it('generateAadhaarOtp returns refId from response', async () => {
    const fetchSpy = mockFetch(async () => jsonResponse({ ref_id: 987654, message: 'sent' }));
    const handle = await provider.generateAadhaarOtp('123456789012');
    expect(handle.refId).toBe('987654');
    expect(handle.message).toBe('sent');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://sandbox.cashfree.com/verification/offline-aadhaar/otp',
      expect.any(Object),
    );
  });

  it('generateAadhaarOtp throws when provider returns 401', async () => {
    mockFetch(async () => jsonResponse({ message: 'bad creds' }, 401));
    await expect(provider.generateAadhaarOtp('123456789012')).rejects.toThrow('UNAUTHORIZED');
  });

  it('confirmAadhaarOtp returns verified on VALID status', async () => {
    mockFetch(async () =>
      jsonResponse({ status: 'VALID', name: 'Ravi', dob: '1990-01-01', gender: 'M' }),
    );
    const result = await provider.confirmAadhaarOtp('CF-1', '123456');
    expect(result.verified).toBe(true);
    expect(result.name).toBe('Ravi');
    expect(result.gender).toBe('M');
  });

  it('confirmAadhaarOtp returns OTP_REJECTED on invalid status', async () => {
    mockFetch(async () => jsonResponse({ status: 'INVALID', message: 'wrong otp' }));
    const result = await provider.confirmAadhaarOtp('CF-1', '000000');
    expect(result.verified).toBe(false);
    expect(result.errorCode).toBe('OTP_REJECTED');
  });

  // ─── URL selection sandbox vs prod ────────────────────────────

  it('uses production base URL when configured', async () => {
    const prodProvider = new CashfreeKycProvider({
      ...config,
      baseUrl: 'https://api.cashfree.com',
    });
    const fetchSpy = mockFetch(async () => jsonResponse({ status: 'VALID' }));
    await prodProvider.verifyPan('ABCDE1234F');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.cashfree.com/verification/pan',
      expect.any(Object),
    );
  });
});
