import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MastersIndiaEInvoiceProvider } from '../masters-india.provider';
import type { NicInvoicePayload } from '@caratflow/shared-types';

const payload: NicInvoicePayload = {
  Version: '1.1',
  TranDtls: { TaxSch: 'GST', SupTyp: 'B2B' },
  DocDtls: { Typ: 'INV', No: 'INV-0001', Dt: '15/04/2026' },
  SellerDtls: {
    Gstin: '29ABCDE1234F1Z5',
    LglNm: 'Seller',
    Addr1: 'A',
    Loc: 'B',
    Pin: 560001,
    Stcd: '29',
  },
  BuyerDtls: {
    Gstin: '29ZZZZZ1234Z1Z5',
    LglNm: 'Buyer',
    Addr1: 'A',
    Loc: 'B',
    Pin: 560001,
    Stcd: '29',
  },
  ItemList: [],
  ValDtls: {
    AssVal: 1000, CgstVal: 15, SgstVal: 15, IgstVal: 0, CesVal: 0, StCesVal: 0,
    Discount: 0, OthChrg: 0, RndOffAmt: 0, TotInvVal: 1030,
  },
};

describe('MastersIndiaEInvoiceProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const ORIGINAL_FETCH = globalThis.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.MASTERS_INDIA_USERNAME = 'test-user';
    process.env.MASTERS_INDIA_PASSWORD = 'test-pass';
    process.env.MASTERS_INDIA_GSTIN = '29ABCDE1234F1Z5';
    process.env.MASTERS_INDIA_BASE_URL = 'https://sandb-aspsdk.mastersindia.co';

    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    process.env = { ...originalEnv };
  });

  const mockAuth = () =>
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'fake-token',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    });

  it('isConfigured returns true when env vars set', () => {
    expect(MastersIndiaEInvoiceProvider.isConfigured()).toBe(true);
  });

  it('isConfigured returns false when credentials missing', () => {
    delete process.env.MASTERS_INDIA_USERNAME;
    expect(MastersIndiaEInvoiceProvider.isConfigured()).toBe(false);
  });

  it('generateIrn happy path returns IRN and signed QR', async () => {
    mockAuth();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: {
          message: {
            Irn: 'abc123irn',
            AckNo: 112345,
            AckDt: '2026-04-15 10:00:00',
            SignedInvoice: 'jwt.signed.invoice',
            SignedQRCode: 'jwt.signed.qr',
          },
        },
      }),
    });

    const provider = new MastersIndiaEInvoiceProvider();
    const res = await provider.generateIrn(payload);

    expect(res.status).toBe('ACT');
    expect(res.irn).toBe('abc123irn');
    expect(res.ackNo).toBe('112345');
    expect(res.signedQrCode).toBe('jwt.signed.qr');
    expect(res.signedInvoice).toBe('jwt.signed.invoice');

    // Second call (generate) should have Authorization + gstin headers.
    const [, generateCall] = fetchMock.mock.calls;
    const headers = (generateCall[1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer fake-token');
    expect(headers.gstin).toBe('29ABCDE1234F1Z5');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('generateIrn maps IRP error payload to ERROR status', async () => {
    mockAuth();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: {
          error: { error_cd: '2150', message: 'Duplicate IRN' },
        },
      }),
    });

    const res = await new MastersIndiaEInvoiceProvider().generateIrn(payload);
    expect(res.status).toBe('ERROR');
    expect(res.irn).toBeNull();
    expect(res.errorCode).toBe('2150');
    expect(res.errorMessage).toBe('Duplicate IRN');
  });

  it('generateIrn maps HTTP error to ERROR with HTTP_ code', async () => {
    mockAuth();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'internal error',
    });

    const res = await new MastersIndiaEInvoiceProvider().generateIrn(payload);
    expect(res.status).toBe('ERROR');
    expect(res.errorCode).toBe('HTTP_500');
  });

  it('authenticate throws when credentials missing', async () => {
    delete process.env.MASTERS_INDIA_PASSWORD;
    await expect(
      new MastersIndiaEInvoiceProvider().generateIrn(payload),
    ).rejects.toThrow(/credentials not configured/);
  });

  it('cancelIrn happy path returns CNL', async () => {
    mockAuth();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: {
          message: { Irn: 'abc', CancelDate: '2026-04-15 11:00:00' },
        },
      }),
    });

    const res = await new MastersIndiaEInvoiceProvider().cancelIrn(
      'abc',
      '1',
      'duplicate',
    );
    expect(res.status).toBe('CNL');
    expect(res.cancelDate).toBe('2026-04-15 11:00:00');
  });

  it('getIrnDetails returns ACT when Status=ACT', async () => {
    mockAuth();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: {
          message: { Irn: 'abc', AckNo: 999, AckDt: '2026-04-15', Status: 'ACT' },
        },
      }),
    });

    const res = await new MastersIndiaEInvoiceProvider().getIrnDetails('abc');
    expect(res.status).toBe('ACT');
    expect(res.irn).toBe('abc');
    expect(res.ackNo).toBe('999');
  });
});
