import { describe, it, expect } from 'vitest';
import { DraftOnlyEInvoiceProvider } from '../draft-only.provider';
import type { NicInvoicePayload } from '@caratflow/shared-types';

const basePayload: NicInvoicePayload = {
  Version: '1.1',
  TranDtls: { TaxSch: 'GST', SupTyp: 'B2B' },
  DocDtls: { Typ: 'INV', No: 'INV-202604-0001', Dt: '15/04/2026' },
  SellerDtls: {
    Gstin: '29ABCDE1234F1Z5',
    LglNm: 'Seller Ltd',
    Addr1: '123 Main Rd',
    Loc: 'Bengaluru',
    Pin: 560001,
    Stcd: '29',
  },
  BuyerDtls: {
    Gstin: 'URP',
    LglNm: 'Walk-in',
    Addr1: 'NA',
    Loc: 'NA',
    Pin: 0,
    Stcd: '00',
  },
  ItemList: [],
  ValDtls: {
    AssVal: 1000,
    CgstVal: 15,
    SgstVal: 15,
    IgstVal: 0,
    CesVal: 0,
    StCesVal: 0,
    Discount: 0,
    OthChrg: 0,
    RndOffAmt: 0,
    TotInvVal: 1030,
  },
};

describe('DraftOnlyEInvoiceProvider', () => {
  const provider = new DraftOnlyEInvoiceProvider();

  it('has name "draft-only"', () => {
    expect(provider.name).toBe('draft-only');
  });

  it('generateIrn returns DRAFT status with no IRN', async () => {
    const res = await provider.generateIrn(basePayload);
    expect(res.status).toBe('DRAFT');
    expect(res.irn).toBeNull();
    expect(res.ackNo).toBeNull();
    expect(res.signedQrCode).toBeNull();
    expect(res.signedInvoice).toBeNull();
    expect(res.rawPayload).toEqual(basePayload);
  });

  it('cancelIrn throws BadRequest (not supported)', async () => {
    await expect(provider.cancelIrn('IRN', '1', 'test')).rejects.toThrow(
      /DRAFT mode/,
    );
  });

  it('getIrnDetails throws BadRequest (not supported)', async () => {
    await expect(provider.getIrnDetails('IRN')).rejects.toThrow(/DRAFT mode/);
  });
});
