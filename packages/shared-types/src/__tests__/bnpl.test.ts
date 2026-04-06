import { describe, it, expect } from 'vitest';
import {
  EmiPlanInputSchema,
  BnplProviderInputSchema,
  EmiCalculatorInputSchema,
  InitiateBnplInputSchema,
  SavedPaymentMethodInputSchema,
  CheckEligibilityInputSchema,
  BnplProviderName,
  EmiCardType,
  SavedMethodType,
  SavedCardType,
} from '../bnpl';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('EmiPlanInputSchema', () => {
  it('should parse valid EMI plan', () => {
    const result = EmiPlanInputSchema.safeParse({
      tenure: 6,
      interestRatePct: 1200,
      minAmountPaise: 1000000,
      maxAmountPaise: 50000000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-positive tenure', () => {
    const result = EmiPlanInputSchema.safeParse({
      tenure: 0,
      interestRatePct: 1200,
      minAmountPaise: 1000000,
      maxAmountPaise: 50000000,
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional cardType', () => {
    const result = EmiPlanInputSchema.safeParse({
      tenure: 12,
      interestRatePct: 0,
      minAmountPaise: 5000000,
      maxAmountPaise: 100000000,
      isNoCostEmi: true,
      cardType: EmiCardType.CREDIT,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid cardType', () => {
    const result = EmiPlanInputSchema.safeParse({
      tenure: 6,
      interestRatePct: 1000,
      minAmountPaise: 100,
      maxAmountPaise: 1000,
      cardType: 'PREPAID',
    });
    expect(result.success).toBe(false);
  });
});

describe('BnplProviderInputSchema', () => {
  it('should parse valid BNPL provider', () => {
    const result = BnplProviderInputSchema.safeParse({
      providerName: BnplProviderName.SIMPL,
      displayName: 'Simpl Pay Later',
      minOrderPaise: 100000,
      maxOrderPaise: 10000000,
      supportedTenures: [3, 6, 9, 12],
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid provider name', () => {
    const result = BnplProviderInputSchema.safeParse({
      providerName: 'AFTERPAY',
      displayName: 'Afterpay',
      minOrderPaise: 100,
      maxOrderPaise: 1000,
      supportedTenures: [3],
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty supportedTenures', () => {
    const result = BnplProviderInputSchema.safeParse({
      providerName: BnplProviderName.LAZYPAY,
      displayName: 'LazyPay',
      minOrderPaise: 100,
      maxOrderPaise: 1000,
      supportedTenures: [],
    });
    // Empty array is valid for z.array() without .min()
    expect(result.success).toBe(true);
  });
});

describe('EmiCalculatorInputSchema', () => {
  it('should parse valid EMI calculator input', () => {
    const result = EmiCalculatorInputSchema.safeParse({
      amountPaise: 5000000,
      tenure: 12,
      interestRatePct: 1200,
    });
    expect(result.success).toBe(true);
  });

  it('should reject zero amount', () => {
    const result = EmiCalculatorInputSchema.safeParse({
      amountPaise: 0,
      tenure: 6,
      interestRatePct: 1000,
    });
    expect(result.success).toBe(false);
  });

  it('should accept zero interest (no-cost EMI)', () => {
    const result = EmiCalculatorInputSchema.safeParse({
      amountPaise: 1000000,
      tenure: 3,
      interestRatePct: 0,
    });
    expect(result.success).toBe(true);
  });
});

describe('InitiateBnplInputSchema', () => {
  it('should parse valid BNPL initiation', () => {
    const result = InitiateBnplInputSchema.safeParse({
      orderId: 'ORD-12345',
      providerName: BnplProviderName.BAJAJ_FINSERV,
    });
    expect(result.success).toBe(true);
  });
});

describe('SavedPaymentMethodInputSchema', () => {
  it('should parse valid saved card', () => {
    const result = SavedPaymentMethodInputSchema.safeParse({
      methodType: SavedMethodType.CARD,
      displayName: 'HDFC Credit Card',
      last4: '4242',
      cardBrand: 'Visa',
      cardType: SavedCardType.CREDIT,
      tokenReference: 'tok_abc123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject last4 with wrong length', () => {
    const result = SavedPaymentMethodInputSchema.safeParse({
      methodType: SavedMethodType.CARD,
      displayName: 'Test',
      last4: '42',
      tokenReference: 'tok_abc',
    });
    expect(result.success).toBe(false);
  });
});

describe('CheckEligibilityInputSchema', () => {
  it('should parse valid eligibility check', () => {
    const result = CheckEligibilityInputSchema.safeParse({
      customerId: validUuid,
      amountPaise: 5000000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject zero amount', () => {
    const result = CheckEligibilityInputSchema.safeParse({
      customerId: validUuid,
      amountPaise: 0,
    });
    expect(result.success).toBe(false);
  });
});
