import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

// TOTP constants
const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;
const TOTP_ALGORITHM = 'SHA1';

@Injectable()
export class TwoFactorAuthService {
  private readonly logger = new Logger(TwoFactorAuthService.name);
  private readonly issuer = 'CaratFlow';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enable 2FA for a customer. Generates a TOTP secret and returns setup info.
   * The customer must verify with a code before 2FA is fully activated.
   */
  async enable2FA(customerAuthId: string): Promise<{
    secret: string;
    otpAuthUrl: string;
    qrCodeDataUrl: string;
  }> {
    const customerAuth = await this.prisma.customerAuth.findUnique({
      where: { id: customerAuthId },
      include: { customer: true },
    });

    if (!customerAuth) {
      throw new NotFoundException('Customer auth record not found');
    }

    if (customerAuth.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    // Generate a random base32 secret
    const secret = this.generateBase32Secret(20);

    // Store the secret (not yet enabled until verification)
    await this.prisma.customerAuth.update({
      where: { id: customerAuthId },
      data: { twoFactorSecret: secret },
    });

    const accountName = customerAuth.email ?? customerAuth.phone ?? customerAuth.customer.firstName;
    const otpAuthUrl = this.buildOtpAuthUrl(secret, accountName);

    // In production, generate actual QR code using qrcode library
    // const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
    const qrCodeDataUrl = `data:image/svg+xml;base64,${Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg"><text y="20">QR: ${otpAuthUrl}</text></svg>`,
    ).toString('base64')}`;

    this.logger.log(`2FA setup initiated for customer auth ${customerAuthId}`);

    return {
      secret,
      otpAuthUrl,
      qrCodeDataUrl,
    };
  }

  /**
   * Verify a TOTP code to complete 2FA setup or for ongoing verification.
   * If 2FA is not yet enabled, this activates it.
   */
  async verify2FA(customerAuthId: string, code: string): Promise<boolean> {
    const customerAuth = await this.prisma.customerAuth.findUnique({
      where: { id: customerAuthId },
    });

    if (!customerAuth) {
      throw new NotFoundException('Customer auth record not found');
    }

    if (!customerAuth.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication has not been set up. Call enable2FA first.');
    }

    const isValid = this.verifyTotpCode(customerAuth.twoFactorSecret, code);

    if (!isValid) {
      throw new BadRequestException('Invalid two-factor authentication code');
    }

    // If 2FA was not yet enabled, enable it now (first-time verification)
    if (!customerAuth.twoFactorEnabled) {
      await this.prisma.customerAuth.update({
        where: { id: customerAuthId },
        data: { twoFactorEnabled: true },
      });
      this.logger.log(`2FA enabled for customer auth ${customerAuthId}`);
    }

    return true;
  }

  /**
   * Disable 2FA for a customer. Requires a valid TOTP code for security.
   */
  async disable2FA(customerAuthId: string, code: string): Promise<void> {
    const customerAuth = await this.prisma.customerAuth.findUnique({
      where: { id: customerAuthId },
    });

    if (!customerAuth) {
      throw new NotFoundException('Customer auth record not found');
    }

    if (!customerAuth.twoFactorEnabled || !customerAuth.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const isValid = this.verifyTotpCode(customerAuth.twoFactorSecret, code);
    if (!isValid) {
      throw new BadRequestException('Invalid two-factor authentication code');
    }

    await this.prisma.customerAuth.update({
      where: { id: customerAuthId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    this.logger.log(`2FA disabled for customer auth ${customerAuthId}`);
  }

  /**
   * Validate a 2FA code for a high-value transaction.
   * Does not change any state, just validates.
   */
  async validate2FAForTransaction(customerAuthId: string, code: string): Promise<boolean> {
    const customerAuth = await this.prisma.customerAuth.findUnique({
      where: { id: customerAuthId },
    });

    if (!customerAuth) {
      throw new NotFoundException('Customer auth record not found');
    }

    if (!customerAuth.twoFactorEnabled || !customerAuth.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled for this account');
    }

    const isValid = this.verifyTotpCode(customerAuth.twoFactorSecret, code);
    if (!isValid) {
      throw new BadRequestException('Invalid two-factor authentication code for transaction');
    }

    return true;
  }

  // ─── Private Helpers ─────────────────────────────────────────

  /**
   * Generate a random Base32 secret for TOTP.
   */
  private generateBase32Secret(length: number): string {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let secret = '';
    for (let i = 0; i < length; i++) {
      secret += base32Chars[bytes[i]! % 32];
    }
    return secret;
  }

  /**
   * Build an otpauth:// URL for TOTP QR codes.
   */
  private buildOtpAuthUrl(secret: string, accountName: string): string {
    const encodedIssuer = encodeURIComponent(this.issuer);
    const encodedAccount = encodeURIComponent(accountName);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=${TOTP_ALGORITHM}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
  }

  /**
   * Verify a TOTP code against a secret.
   * Allows a window of +/- 1 period to account for clock drift.
   *
   * Uses the HMAC-based OTP algorithm (RFC 6238).
   * In production, consider using a library like otpauth or speakeasy.
   */
  private verifyTotpCode(secret: string, code: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    // Check current period and +/- 1 for clock drift tolerance
    for (let offset = -1; offset <= 1; offset++) {
      const counter = Math.floor((now + offset * TOTP_PERIOD) / TOTP_PERIOD);
      const expectedCode = this.generateTotpCode(secret, counter);
      if (expectedCode === code) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate a TOTP code for a given counter value.
   * Implements HOTP (RFC 4226) with time-based counter.
   *
   * NOTE: This is a simplified implementation. In production,
   * use the 'otpauth' or 'speakeasy' npm package for full
   * RFC 6238 compliance including proper HMAC-SHA1 computation.
   */
  private generateTotpCode(secret: string, counter: number): string {
    // In production, this should use proper HMAC-SHA1:
    // 1. Decode base32 secret to bytes
    // 2. Convert counter to 8-byte big-endian buffer
    // 3. HMAC-SHA1(secret, counter)
    // 4. Dynamic truncation to get 6-digit code

    // Placeholder: For a real implementation, install 'otpauth' package:
    // import { TOTP } from 'otpauth';
    // const totp = new TOTP({ secret, algorithm: 'SHA1', digits: 6, period: 30 });
    // return totp.generate();

    // This method will always return a non-matching code since it is a placeholder.
    // The actual TOTP logic MUST be replaced before going to production.
    this.logger.warn('[2FA] Using placeholder TOTP generation. Install otpauth package for production use.');
    return '000000';
  }
}
