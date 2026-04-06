import { describe, it, expect } from 'vitest';
import {
  GirviLoanInputSchema,
  GirviPaymentInputSchema,
  GirviAuctionInputSchema,
  KittySchemeInputSchema,
  KittyMemberInputSchema,
  KittyInstallmentInputSchema,
  GoldSavingsSchemeInputSchema,
  GoldSavingsMemberInputSchema,
  GoldSavingsInstallmentInputSchema,
  KycVerificationInputSchema,
  KycVerifyInputSchema,
  MetalRateInputSchema,
  UpiPaymentInputSchema,
  BankTransferTemplateInputSchema,
  GirviInterestType,
  GirviPaymentType,
  GirviPaymentMethod,
  KittySchemeType,
  KycVerificationType,
  MetalRateSource,
} from '../india';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('GirviLoanInputSchema', () => {
  it('should parse valid girvi loan', () => {
    const result = GirviLoanInputSchema.safeParse({
      customerId: validUuid,
      locationId: validUuid,
      collateralDescription: 'Gold necklace set',
      metalType: 'GOLD',
      grossWeightMg: 50000,
      netWeightMg: 48000,
      purityFineness: 916,
      appraisedValuePaise: 30000000,
      loanAmountPaise: 20000000,
      interestRate: 1200,
      interestType: GirviInterestType.SIMPLE,
      disbursedDate: '2026-04-01',
      dueDate: '2027-04-01',
    });
    expect(result.success).toBe(true);
  });

  it('should reject zero loanAmountPaise', () => {
    const result = GirviLoanInputSchema.safeParse({
      customerId: validUuid,
      locationId: validUuid,
      collateralDescription: 'Test',
      metalType: 'GOLD',
      grossWeightMg: 10000,
      netWeightMg: 9000,
      purityFineness: 750,
      appraisedValuePaise: 1000000,
      loanAmountPaise: 0,
      interestRate: 1200,
      interestType: GirviInterestType.COMPOUND,
      disbursedDate: '2026-04-01',
      dueDate: '2027-04-01',
    });
    expect(result.success).toBe(false);
  });

  it('should reject interestRate above 10000', () => {
    const result = GirviLoanInputSchema.safeParse({
      customerId: validUuid,
      locationId: validUuid,
      collateralDescription: 'Test',
      metalType: 'GOLD',
      grossWeightMg: 10000,
      netWeightMg: 9000,
      purityFineness: 916,
      appraisedValuePaise: 1000000,
      loanAmountPaise: 500000,
      interestRate: 10001,
      interestType: GirviInterestType.SIMPLE,
      disbursedDate: '2026-04-01',
      dueDate: '2027-04-01',
    });
    expect(result.success).toBe(false);
  });
});

describe('GirviPaymentInputSchema', () => {
  it('should parse valid girvi payment', () => {
    const result = GirviPaymentInputSchema.safeParse({
      girviLoanId: validUuid,
      paymentDate: '2026-05-01',
      paymentType: GirviPaymentType.INTEREST_ONLY,
      interestPaise: 50000,
      method: GirviPaymentMethod.CASH,
    });
    expect(result.success).toBe(true);
  });
});

describe('GirviAuctionInputSchema', () => {
  it('should parse valid auction input', () => {
    const result = GirviAuctionInputSchema.safeParse({
      girviLoanId: validUuid,
      auctionDate: '2026-10-01',
      reservePricePaise: 15000000,
    });
    expect(result.success).toBe(true);
  });
});

describe('KittySchemeInputSchema', () => {
  it('should parse valid kitty scheme', () => {
    const result = KittySchemeInputSchema.safeParse({
      schemeName: 'Monthly Gold Kitty',
      schemeType: KittySchemeType.KITTY,
      monthlyAmountPaise: 500000,
      durationMonths: 12,
      startDate: '2026-01-01',
      maxMembers: 25,
    });
    expect(result.success).toBe(true);
  });

  it('should reject durationMonths > 120', () => {
    const result = KittySchemeInputSchema.safeParse({
      schemeName: 'Test',
      schemeType: KittySchemeType.CHIT,
      monthlyAmountPaise: 100000,
      durationMonths: 121,
      startDate: '2026-01-01',
      maxMembers: 10,
    });
    expect(result.success).toBe(false);
  });
});

describe('KittyMemberInputSchema', () => {
  it('should parse valid kitty member', () => {
    const result = KittyMemberInputSchema.safeParse({
      kittySchemeId: validUuid,
      customerId: validUuid,
      joinedDate: '2026-01-15',
    });
    expect(result.success).toBe(true);
  });
});

describe('KittyInstallmentInputSchema', () => {
  it('should parse valid kitty installment', () => {
    const result = KittyInstallmentInputSchema.safeParse({
      kittyMemberId: validUuid,
      installmentNumber: 1,
      paidDate: '2026-02-01',
      amountPaise: 500000,
      method: GirviPaymentMethod.UPI,
    });
    expect(result.success).toBe(true);
  });
});

describe('GoldSavingsSchemeInputSchema', () => {
  it('should parse valid gold savings scheme', () => {
    const result = GoldSavingsSchemeInputSchema.safeParse({
      schemeName: 'Annual Gold Savings',
      monthlyAmountPaise: 1000000,
      durationMonths: 11,
      bonusMonths: 1,
      maturityBonusPercent: 0,
      startDate: '2026-04-01',
    });
    expect(result.success).toBe(true);
  });
});

describe('GoldSavingsMemberInputSchema', () => {
  it('should parse valid member input', () => {
    const result = GoldSavingsMemberInputSchema.safeParse({
      goldSavingsSchemeId: validUuid,
      customerId: validUuid,
      joinedDate: '2026-04-15',
    });
    expect(result.success).toBe(true);
  });
});

describe('KycVerificationInputSchema', () => {
  it('should parse valid KYC verification', () => {
    const result = KycVerificationInputSchema.safeParse({
      customerId: validUuid,
      verificationType: KycVerificationType.AADHAAR,
      documentNumber: '1234-5678-9012',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty document number', () => {
    const result = KycVerificationInputSchema.safeParse({
      customerId: validUuid,
      verificationType: KycVerificationType.PAN,
      documentNumber: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid verification type', () => {
    const result = KycVerificationInputSchema.safeParse({
      customerId: validUuid,
      verificationType: 'GST',
      documentNumber: 'ABC123',
    });
    expect(result.success).toBe(false);
  });
});

describe('KycVerifyInputSchema', () => {
  it('should parse valid verify input', () => {
    const result = KycVerifyInputSchema.safeParse({
      verificationId: validUuid,
      status: 'VERIFIED',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const result = KycVerifyInputSchema.safeParse({
      verificationId: validUuid,
      status: 'APPROVED',
    });
    expect(result.success).toBe(false);
  });
});

describe('MetalRateInputSchema', () => {
  it('should parse valid metal rate', () => {
    const result = MetalRateInputSchema.safeParse({
      metalType: 'GOLD',
      purity: 999,
      ratePerGramPaise: 650000,
      ratePer10gPaise: 6500000,
      ratePerTolaPaise: 7581600,
      ratePerTroyOzPaise: 20221775,
      source: MetalRateSource.IBJA,
      recordedAt: '2026-04-07T10:00:00Z',
    });
    expect(result.success).toBe(true);
  });
});

describe('UpiPaymentInputSchema', () => {
  it('should parse valid UPI payment', () => {
    const result = UpiPaymentInputSchema.safeParse({
      payeeVpa: 'shop@upi',
      payeeName: 'Jeweler Shop',
      amountPaise: 5000000,
    });
    expect(result.success).toBe(true);
  });
});

describe('BankTransferTemplateInputSchema', () => {
  it('should parse valid NEFT transfer', () => {
    const result = BankTransferTemplateInputSchema.safeParse({
      transferType: 'NEFT',
      beneficiaryName: 'Supplier Gold Pvt Ltd',
      accountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
      amountPaise: 100000000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid IFSC code', () => {
    const result = BankTransferTemplateInputSchema.safeParse({
      transferType: 'NEFT',
      beneficiaryName: 'Test',
      accountNumber: '123',
      ifscCode: 'INVALID',
      amountPaise: 100,
    });
    expect(result.success).toBe(false);
  });
});
