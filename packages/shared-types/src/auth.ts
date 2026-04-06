// ─── CaratFlow B2C Authentication Types & Schemas ──────────────
import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────

export enum SocialProviderEnum {
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
  APPLE = 'APPLE',
}

export enum OtpPurposeEnum {
  LOGIN = 'LOGIN',
  REGISTRATION = 'REGISTRATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TRANSACTION_2FA = 'TRANSACTION_2FA',
}

export enum LoginProviderEnum {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
  APPLE = 'APPLE',
}

// ─── Registration ─────────────────────────────────────────────

export const RegisterB2CEmailInputSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  tenantSlug: z.string().min(1).max(100),
});
export type RegisterB2CEmailInput = z.infer<typeof RegisterB2CEmailInputSchema>;

export const RegisterB2CPhoneInputSchema = z.object({
  phone: z.string().min(10).max(20),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  tenantSlug: z.string().min(1).max(100),
});
export type RegisterB2CPhoneInput = z.infer<typeof RegisterB2CPhoneInputSchema>;

// ─── Login ────────────────────────────────────────────────────

export const LoginB2CEmailInputSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
  tenantSlug: z.string().min(1).max(100),
  twoFactorCode: z.string().length(6).optional(),
});
export type LoginB2CEmailInput = z.infer<typeof LoginB2CEmailInputSchema>;

export const LoginB2CPhoneInputSchema = z.object({
  phone: z.string().min(10).max(20),
  tenantSlug: z.string().min(1).max(100),
});
export type LoginB2CPhoneInput = z.infer<typeof LoginB2CPhoneInputSchema>;

// ─── OTP ──────────────────────────────────────────────────────

export const OtpRequestInputSchema = z.object({
  identifier: z.string().min(1).max(255),
  purpose: z.nativeEnum(OtpPurposeEnum),
});
export type OtpRequestInput = z.infer<typeof OtpRequestInputSchema>;

export const OtpVerifyInputSchema = z.object({
  identifier: z.string().min(1).max(255),
  otp: z.string().length(6),
  purpose: z.nativeEnum(OtpPurposeEnum),
  tenantSlug: z.string().min(1).max(100).optional(),
});
export type OtpVerifyInput = z.infer<typeof OtpVerifyInputSchema>;

// ─── Social Login ─────────────────────────────────────────────

export const SocialLoginInputSchema = z.object({
  provider: z.nativeEnum(SocialProviderEnum),
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
  tenantSlug: z.string().min(1).max(100),
}).refine(
  (data) => data.idToken || data.accessToken,
  { message: 'Either idToken or accessToken must be provided' },
);
export type SocialLoginInput = z.infer<typeof SocialLoginInputSchema>;

// ─── Two-Factor Auth ──────────────────────────────────────────

export const Enable2FAInputSchema = z.object({
  customerId: z.string().uuid(),
});
export type Enable2FAInput = z.infer<typeof Enable2FAInputSchema>;

export const Verify2FAInputSchema = z.object({
  code: z.string().length(6),
});
export type Verify2FAInput = z.infer<typeof Verify2FAInputSchema>;

export const Disable2FAInputSchema = z.object({
  code: z.string().length(6),
});
export type Disable2FAInput = z.infer<typeof Disable2FAInputSchema>;

// ─── Refresh Token ────────────────────────────────────────────

export const B2CRefreshInputSchema = z.object({
  refreshToken: z.string().min(1),
});
export type B2CRefreshInput = z.infer<typeof B2CRefreshInputSchema>;

// ─── Response Types ───────────────────────────────────────────

export interface B2CCustomerProfile {
  id: string;
  customerId: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  twoFactorEnabled: boolean;
  loginProvider: LoginProviderEnum;
  tenantId: string;
}

export interface B2CAuthResponse {
  customer: B2CCustomerProfile;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface B2CTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpAuthUrl: string;
  qrCodeDataUrl: string;
}

// ─── B2C JWT Payload ──────────────────────────────────────────

export interface B2CJwtPayload {
  sub: string;           // customerAuthId
  customerId: string;
  tenantId: string;
  email: string | null;
  phone: string | null;
  type: 'b2c';
}
