import { describe, it, expect } from 'vitest';
import {
  BuyGoldInputSchema,
  SellGoldInputSchema,
  CreateSipInputSchema,
  RedeemGoldInputSchema,
  GoldPriceAlertInputSchema,
  GoldTransactionListInputSchema,
  GoldSipType,
  GoldSipFrequency,
  GoldRedemptionType,
  GoldPriceAlertType,
} from '../digital-gold';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('BuyGoldInputSchema', () => {
  it('should parse buy by amount', () => {
    const result = BuyGoldInputSchema.safeParse({
      amountPaise: 100000,
      paymentMethod: 'UPI',
    });
    expect(result.success).toBe(true);
  });

  it('should parse buy by weight', () => {
    const result = BuyGoldInputSchema.safeParse({
      weightMg: 1000,
      paymentMethod: 'NET_BANKING',
    });
    expect(result.success).toBe(true);
  });

  it('should reject when neither amount nor weight provided', () => {
    const result = BuyGoldInputSchema.safeParse({
      paymentMethod: 'UPI',
    });
    expect(result.success).toBe(false);
  });

  it('should reject when both amount and weight provided', () => {
    const result = BuyGoldInputSchema.safeParse({
      amountPaise: 100000,
      weightMg: 1000,
      paymentMethod: 'UPI',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid payment method', () => {
    const result = BuyGoldInputSchema.safeParse({
      amountPaise: 100000,
      paymentMethod: 'CASH',
    });
    expect(result.success).toBe(false);
  });
});

describe('SellGoldInputSchema', () => {
  it('should parse valid sell input', () => {
    const result = SellGoldInputSchema.safeParse({
      weightMg: 5000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject zero weight', () => {
    const result = SellGoldInputSchema.safeParse({
      weightMg: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateSipInputSchema', () => {
  it('should parse valid fixed amount monthly SIP', () => {
    const result = CreateSipInputSchema.safeParse({
      sipType: GoldSipType.FIXED_AMOUNT,
      amountPaise: 100000,
      frequency: GoldSipFrequency.MONTHLY,
      dayOfMonth: 15,
      startDate: '2026-05-01',
      paymentMethod: 'AUTO_DEBIT',
    });
    expect(result.success).toBe(true);
  });

  it('should parse valid fixed weight weekly SIP', () => {
    const result = CreateSipInputSchema.safeParse({
      sipType: GoldSipType.FIXED_WEIGHT,
      weightMg: 500,
      frequency: GoldSipFrequency.WEEKLY,
      dayOfWeek: 1,
      startDate: '2026-05-01',
      paymentMethod: 'UPI',
    });
    expect(result.success).toBe(true);
  });

  it('should reject FIXED_AMOUNT without amountPaise', () => {
    const result = CreateSipInputSchema.safeParse({
      sipType: GoldSipType.FIXED_AMOUNT,
      frequency: GoldSipFrequency.MONTHLY,
      dayOfMonth: 15,
      startDate: '2026-05-01',
      paymentMethod: 'AUTO_DEBIT',
    });
    expect(result.success).toBe(false);
  });

  it('should reject MONTHLY without dayOfMonth', () => {
    const result = CreateSipInputSchema.safeParse({
      sipType: GoldSipType.FIXED_AMOUNT,
      amountPaise: 100000,
      frequency: GoldSipFrequency.MONTHLY,
      startDate: '2026-05-01',
      paymentMethod: 'AUTO_DEBIT',
    });
    expect(result.success).toBe(false);
  });

  it('should allow DAILY without day specification', () => {
    const result = CreateSipInputSchema.safeParse({
      sipType: GoldSipType.FIXED_AMOUNT,
      amountPaise: 10000,
      frequency: GoldSipFrequency.DAILY,
      startDate: '2026-05-01',
      paymentMethod: 'WALLET',
    });
    expect(result.success).toBe(true);
  });
});

describe('RedeemGoldInputSchema', () => {
  it('should parse physical gold redemption', () => {
    const result = RedeemGoldInputSchema.safeParse({
      redemptionType: GoldRedemptionType.PHYSICAL_GOLD,
      weightMg: 10000,
      addressId: 'addr-1',
    });
    expect(result.success).toBe(true);
  });

  it('should parse jewelry redemption with productId', () => {
    const result = RedeemGoldInputSchema.safeParse({
      redemptionType: GoldRedemptionType.JEWELRY,
      productId: validUuid,
      addressId: 'addr-1',
    });
    expect(result.success).toBe(true);
  });

  it('should reject jewelry redemption without productId', () => {
    const result = RedeemGoldInputSchema.safeParse({
      redemptionType: GoldRedemptionType.JEWELRY,
      addressId: 'addr-1',
    });
    expect(result.success).toBe(false);
  });
});

describe('GoldPriceAlertInputSchema', () => {
  it('should parse valid price alert', () => {
    const result = GoldPriceAlertInputSchema.safeParse({
      alertType: GoldPriceAlertType.PRICE_BELOW,
      targetPricePer10gPaise: 6000000,
    });
    expect(result.success).toBe(true);
  });
});

describe('GoldTransactionListInputSchema', () => {
  it('should parse with defaults', () => {
    const result = GoldTransactionListInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
