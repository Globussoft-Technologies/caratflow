import { describe, it, expect } from 'vitest';
import {
  UpdateProfileInputSchema,
  ChangePasswordInputSchema,
  ReturnRequestInputSchema,
  ReturnItemInputSchema,
  RedeemPointsInputSchema,
  EnrollSchemeInputSchema,
  PayInstallmentInputSchema,
  KycUploadInputSchema,
  NotificationPreferencesInputSchema,
  OrderListInputSchema,
} from '../customer-portal';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('UpdateProfileInputSchema', () => {
  it('should parse valid profile update (all optional)', () => {
    const result = UpdateProfileInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should parse partial update', () => {
    const result = UpdateProfileInputSchema.safeParse({
      firstName: 'Priya',
      city: 'Mumbai',
      state: 'Maharashtra',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = UpdateProfileInputSchema.safeParse({
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('should reject country longer than 2 chars', () => {
    const result = UpdateProfileInputSchema.safeParse({
      country: 'IND',
    });
    expect(result.success).toBe(false);
  });

  it('should accept dateOfBirth as date string', () => {
    const result = UpdateProfileInputSchema.safeParse({
      dateOfBirth: '1990-05-15',
    });
    expect(result.success).toBe(true);
  });

  it('should accept preferences as record', () => {
    const result = UpdateProfileInputSchema.safeParse({
      preferences: { newsletter: true, language: 'hi' },
    });
    expect(result.success).toBe(true);
  });
});

describe('ChangePasswordInputSchema', () => {
  it('should parse valid password change', () => {
    const result = ChangePasswordInputSchema.safeParse({
      currentPassword: 'oldpassword123',
      newPassword: 'newstrongpass456',
    });
    expect(result.success).toBe(true);
  });

  it('should reject new password shorter than 8 chars', () => {
    const result = ChangePasswordInputSchema.safeParse({
      currentPassword: 'oldpass',
      newPassword: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty current password', () => {
    const result = ChangePasswordInputSchema.safeParse({
      currentPassword: '',
      newPassword: 'newstrongpass456',
    });
    expect(result.success).toBe(false);
  });
});

describe('ReturnRequestInputSchema (customer-portal)', () => {
  it('should parse valid return request', () => {
    const result = ReturnRequestInputSchema.safeParse({
      orderId: validUuid,
      items: [{
        orderItemId: validUuid,
        quantity: 1,
        reason: 'Received wrong item',
      }],
      reason: 'Product does not match description',
      preferredRefundMethod: 'ORIGINAL_PAYMENT',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty items', () => {
    const result = ReturnRequestInputSchema.safeParse({
      orderId: validUuid,
      items: [],
      reason: 'Test',
      preferredRefundMethod: 'STORE_CREDIT',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid refund method', () => {
    const result = ReturnRequestInputSchema.safeParse({
      orderId: validUuid,
      items: [{ orderItemId: validUuid, quantity: 1, reason: 'Test' }],
      reason: 'Test reason',
      preferredRefundMethod: 'CASH',
    });
    expect(result.success).toBe(false);
  });

  it('should reject item with zero quantity', () => {
    const result = ReturnRequestInputSchema.safeParse({
      orderId: validUuid,
      items: [{ orderItemId: validUuid, quantity: 0, reason: 'Test' }],
      reason: 'Test',
      preferredRefundMethod: 'BANK_TRANSFER',
    });
    expect(result.success).toBe(false);
  });
});

describe('RedeemPointsInputSchema', () => {
  it('should parse valid redemption', () => {
    const result = RedeemPointsInputSchema.safeParse({
      points: 500,
      orderId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it('should reject zero points', () => {
    const result = RedeemPointsInputSchema.safeParse({
      points: 0,
      orderId: validUuid,
    });
    expect(result.success).toBe(false);
  });
});

describe('EnrollSchemeInputSchema', () => {
  it('should parse valid enrollment', () => {
    const result = EnrollSchemeInputSchema.safeParse({
      schemeId: validUuid,
      schemeType: 'KITTY',
    });
    expect(result.success).toBe(true);
  });

  it('should accept GOLD_SAVINGS type', () => {
    const result = EnrollSchemeInputSchema.safeParse({
      schemeId: validUuid,
      schemeType: 'GOLD_SAVINGS',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid scheme type', () => {
    const result = EnrollSchemeInputSchema.safeParse({
      schemeId: validUuid,
      schemeType: 'CHIT',
    });
    expect(result.success).toBe(false);
  });
});

describe('PayInstallmentInputSchema', () => {
  it('should parse valid installment payment', () => {
    const result = PayInstallmentInputSchema.safeParse({
      paymentMethod: 'UPI',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid payment method', () => {
    const result = PayInstallmentInputSchema.safeParse({
      paymentMethod: 'CASH',
    });
    expect(result.success).toBe(false);
  });
});

describe('KycUploadInputSchema', () => {
  it('should parse valid KYC upload', () => {
    const result = KycUploadInputSchema.safeParse({
      documentType: 'AADHAAR',
      documentNumber: '1234-5678-9012',
      fileUrl: 'https://storage.example.com/kyc/aadhaar.pdf',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid document type', () => {
    const result = KycUploadInputSchema.safeParse({
      documentType: 'GST_CERTIFICATE',
      documentNumber: 'ABC123',
      fileUrl: 'https://storage.example.com/doc.pdf',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid file URL', () => {
    const result = KycUploadInputSchema.safeParse({
      documentType: 'PAN',
      documentNumber: 'ABCDE1234F',
      fileUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('NotificationPreferencesInputSchema', () => {
  it('should parse empty preferences (all optional)', () => {
    const result = NotificationPreferencesInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should parse partial preferences', () => {
    const result = NotificationPreferencesInputSchema.safeParse({
      orders: { email: true, sms: false, whatsapp: true, push: true },
      promotions: { email: false, sms: false, whatsapp: false, push: false },
    });
    expect(result.success).toBe(true);
  });
});

describe('OrderListInputSchema', () => {
  it('should parse with defaults', () => {
    const result = OrderListInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should accept status filter', () => {
    const result = OrderListInputSchema.safeParse({
      status: 'DELIVERED',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const result = OrderListInputSchema.safeParse({
      status: 'INVALID',
    });
    expect(result.success).toBe(false);
  });
});
