import { describe, it, expect } from 'vitest';
import {
  ExportOrderInputSchema,
  ExportOrderItemInputSchema,
  ExportInvoiceInputSchema,
  ExportInvoiceItemInputSchema,
  ShippingDocumentInputSchema,
  CustomsDutyCalculationSchema,
  ExchangeRateInputSchema,
  DgftLicenseInputSchema,
  ExportComplianceCheckSchema,
  Incoterms,
  ExportInvoiceType,
  ShippingDocumentType,
  ExchangeRateSource,
  DgftLicenseType,
} from '../export';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('ExportOrderItemInputSchema', () => {
  it('should parse valid export order item', () => {
    const result = ExportOrderItemInputSchema.safeParse({
      description: '22K Gold Necklace',
      quantity: 10,
      unitPricePaise: 5000000,
      hsCode: '711319',
      weightMg: 100000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.countryOfOrigin).toBe('IN');
    }
  });

  it('should reject HS code shorter than 4 chars', () => {
    const result = ExportOrderItemInputSchema.safeParse({
      description: 'Test',
      quantity: 1,
      unitPricePaise: 100,
      hsCode: '711',
      weightMg: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe('ExportOrderInputSchema', () => {
  const validItem = {
    description: 'Gold Ring',
    quantity: 5,
    unitPricePaise: 2000000,
    hsCode: '711319',
    weightMg: 50000,
  };

  it('should parse valid export order', () => {
    const result = ExportOrderInputSchema.safeParse({
      buyerId: validUuid,
      buyerCountry: 'US',
      locationId: validUuid,
      exchangeRate: 830000,
      incoterms: Incoterms.FOB,
      paymentTerms: 'Net 30',
      items: [validItem],
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid buyer country code length', () => {
    const result = ExportOrderInputSchema.safeParse({
      buyerId: validUuid,
      buyerCountry: 'USA',
      locationId: validUuid,
      exchangeRate: 830000,
      incoterms: Incoterms.CIF,
      paymentTerms: 'Net 30',
      items: [validItem],
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty items', () => {
    const result = ExportOrderInputSchema.safeParse({
      buyerId: validUuid,
      buyerCountry: 'US',
      locationId: validUuid,
      exchangeRate: 830000,
      incoterms: Incoterms.FOB,
      paymentTerms: 'Net 30',
      items: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('ExportInvoiceInputSchema', () => {
  it('should parse valid export invoice', () => {
    const result = ExportInvoiceInputSchema.safeParse({
      exportOrderId: validUuid,
      invoiceType: ExportInvoiceType.COMMERCIAL,
      buyerId: validUuid,
      currencyCode: 'USD',
      exchangeRate: 830000,
      ieCode: 'IE123456789',
      items: [{
        description: 'Gold Ring',
        quantity: 5,
        unitPricePaise: 2000000,
        hsCode: '711319',
        weightMg: 50000,
        netWeightMg: 45000,
      }],
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing ieCode', () => {
    const result = ExportInvoiceInputSchema.safeParse({
      exportOrderId: validUuid,
      invoiceType: ExportInvoiceType.PROFORMA,
      buyerId: validUuid,
      currencyCode: 'USD',
      exchangeRate: 830000,
      items: [{ description: 'Test', quantity: 1, unitPricePaise: 100, hsCode: '7113', weightMg: 100, netWeightMg: 90 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('ShippingDocumentInputSchema', () => {
  it('should parse valid shipping document', () => {
    const result = ShippingDocumentInputSchema.safeParse({
      exportOrderId: validUuid,
      documentType: ShippingDocumentType.PACKING_LIST,
    });
    expect(result.success).toBe(true);
  });
});

describe('ExchangeRateInputSchema', () => {
  it('should parse valid exchange rate', () => {
    const result = ExchangeRateInputSchema.safeParse({
      fromCurrency: 'USD',
      toCurrency: 'INR',
      rate: 830000,
      source: ExchangeRateSource.RBI,
      effectiveDate: '2026-04-07',
    });
    expect(result.success).toBe(true);
  });
});

describe('DgftLicenseInputSchema', () => {
  it('should parse valid DGFT license', () => {
    const result = DgftLicenseInputSchema.safeParse({
      licenseNumber: 'DGFT-2026-001',
      licenseType: DgftLicenseType.RODTEP,
      issuedDate: '2026-01-01',
      expiryDate: '2027-01-01',
      valuePaise: 50000000,
    });
    expect(result.success).toBe(true);
  });
});

describe('ExportComplianceCheckSchema', () => {
  it('should parse valid compliance check', () => {
    const result = ExportComplianceCheckSchema.safeParse({
      destinationCountry: 'US',
      productCategories: ['gold_jewelry'],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty productCategories', () => {
    const result = ExportComplianceCheckSchema.safeParse({
      destinationCountry: 'US',
      productCategories: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('CustomsDutyCalculationSchema', () => {
  it('should parse valid duty calculation', () => {
    const result = CustomsDutyCalculationSchema.safeParse({
      importCountry: 'US',
      hsCode: '711319',
      assessableValuePaise: 10000000,
    });
    expect(result.success).toBe(true);
  });
});
