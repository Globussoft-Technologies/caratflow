import { describe, it, expect } from 'vitest';
import {
  RegisterB2CEmailInputSchema,
  RegisterB2CPhoneInputSchema,
  LoginB2CEmailInputSchema,
  LoginB2CPhoneInputSchema,
  OtpRequestInputSchema,
  OtpVerifyInputSchema,
  SocialLoginInputSchema,
  Enable2FAInputSchema,
  Verify2FAInputSchema,
  B2CRefreshInputSchema,
  OtpPurposeEnum,
  SocialProviderEnum,
} from '../auth';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('RegisterB2CEmailInputSchema', () => {
  it('should parse valid registration input', () => {
    const result = RegisterB2CEmailInputSchema.safeParse({
      email: 'user@example.com',
      password: 'securepass123',
      firstName: 'Rahul',
      lastName: 'Sharma',
      tenantSlug: 'jeweler-store',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = RegisterB2CEmailInputSchema.safeParse({
      email: 'not-an-email',
      password: 'securepass123',
      firstName: 'Rahul',
      lastName: 'Sharma',
      tenantSlug: 'jeweler-store',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 chars', () => {
    const result = RegisterB2CEmailInputSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
      firstName: 'Rahul',
      lastName: 'Sharma',
      tenantSlug: 'jeweler-store',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing firstName', () => {
    const result = RegisterB2CEmailInputSchema.safeParse({
      email: 'user@example.com',
      password: 'securepass123',
      lastName: 'Sharma',
      tenantSlug: 'jeweler-store',
    });
    expect(result.success).toBe(false);
  });
});

describe('RegisterB2CPhoneInputSchema', () => {
  it('should parse valid phone registration', () => {
    const result = RegisterB2CPhoneInputSchema.safeParse({
      phone: '9876543210',
      password: 'securepass123',
      firstName: 'Rahul',
      lastName: 'Sharma',
      tenantSlug: 'jeweler-store',
    });
    expect(result.success).toBe(true);
  });

  it('should reject phone shorter than 10 chars', () => {
    const result = RegisterB2CPhoneInputSchema.safeParse({
      phone: '12345',
      password: 'securepass123',
      firstName: 'Rahul',
      lastName: 'Sharma',
      tenantSlug: 'jeweler-store',
    });
    expect(result.success).toBe(false);
  });
});

describe('LoginB2CEmailInputSchema', () => {
  it('should parse valid email login', () => {
    const result = LoginB2CEmailInputSchema.safeParse({
      email: 'user@example.com',
      password: 'mypassword',
      tenantSlug: 'jeweler-store',
    });
    expect(result.success).toBe(true);
  });

  it('should allow optional twoFactorCode', () => {
    const result = LoginB2CEmailInputSchema.safeParse({
      email: 'user@example.com',
      password: 'mypassword',
      tenantSlug: 'jeweler-store',
      twoFactorCode: '123456',
    });
    expect(result.success).toBe(true);
  });

  it('should reject twoFactorCode with wrong length', () => {
    const result = LoginB2CEmailInputSchema.safeParse({
      email: 'user@example.com',
      password: 'mypassword',
      tenantSlug: 'jeweler-store',
      twoFactorCode: '1234',
    });
    expect(result.success).toBe(false);
  });
});

describe('LoginB2CPhoneInputSchema', () => {
  it('should parse valid phone login', () => {
    const result = LoginB2CPhoneInputSchema.safeParse({
      phone: '9876543210',
      tenantSlug: 'jeweler-store',
    });
    expect(result.success).toBe(true);
  });
});

describe('OtpRequestInputSchema', () => {
  it('should parse valid OTP request', () => {
    const result = OtpRequestInputSchema.safeParse({
      identifier: 'user@example.com',
      purpose: OtpPurposeEnum.LOGIN,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid purpose enum', () => {
    const result = OtpRequestInputSchema.safeParse({
      identifier: 'user@example.com',
      purpose: 'INVALID_PURPOSE',
    });
    expect(result.success).toBe(false);
  });
});

describe('OtpVerifyInputSchema', () => {
  it('should parse valid OTP verification', () => {
    const result = OtpVerifyInputSchema.safeParse({
      identifier: 'user@example.com',
      otp: '123456',
      purpose: OtpPurposeEnum.REGISTRATION,
    });
    expect(result.success).toBe(true);
  });

  it('should reject OTP with wrong length', () => {
    const result = OtpVerifyInputSchema.safeParse({
      identifier: 'user@example.com',
      otp: '1234',
      purpose: OtpPurposeEnum.LOGIN,
    });
    expect(result.success).toBe(false);
  });
});

describe('SocialLoginInputSchema', () => {
  it('should parse valid social login with idToken', () => {
    const result = SocialLoginInputSchema.safeParse({
      provider: SocialProviderEnum.GOOGLE,
      idToken: 'google-id-token-xyz',
      tenantSlug: 'jeweler-store',
    });
    expect(result.success).toBe(true);
  });

  it('should parse valid social login with accessToken', () => {
    const result = SocialLoginInputSchema.safeParse({
      provider: SocialProviderEnum.FACEBOOK,
      accessToken: 'fb-access-token-xyz',
      tenantSlug: 'jeweler-store',
    });
    expect(result.success).toBe(true);
  });

  it('should reject when neither idToken nor accessToken provided', () => {
    const result = SocialLoginInputSchema.safeParse({
      provider: SocialProviderEnum.GOOGLE,
      tenantSlug: 'jeweler-store',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid provider', () => {
    const result = SocialLoginInputSchema.safeParse({
      provider: 'TWITTER',
      idToken: 'some-token',
      tenantSlug: 'jeweler-store',
    });
    expect(result.success).toBe(false);
  });
});

describe('Enable2FAInputSchema', () => {
  it('should parse valid UUID', () => {
    const result = Enable2FAInputSchema.safeParse({ customerId: validUuid });
    expect(result.success).toBe(true);
  });
});

describe('Verify2FAInputSchema', () => {
  it('should parse 6-digit code', () => {
    const result = Verify2FAInputSchema.safeParse({ code: '123456' });
    expect(result.success).toBe(true);
  });

  it('should reject non-6-digit code', () => {
    const result = Verify2FAInputSchema.safeParse({ code: '12345' });
    expect(result.success).toBe(false);
  });
});

describe('B2CRefreshInputSchema', () => {
  it('should parse valid refresh token', () => {
    const result = B2CRefreshInputSchema.safeParse({ refreshToken: 'some-refresh-token' });
    expect(result.success).toBe(true);
  });

  it('should reject empty refresh token', () => {
    const result = B2CRefreshInputSchema.safeParse({ refreshToken: '' });
    expect(result.success).toBe(false);
  });
});
