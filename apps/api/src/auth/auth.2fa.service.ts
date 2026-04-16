import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { authenticator } from 'otplib';
import { HashAlgorithms } from 'otplib/core';
import * as QRCode from 'qrcode';
import { PrismaService } from '../common/prisma.service';

// TOTP constants (RFC 6238 defaults)
const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;
// Allow +/- 1 period drift
const TOTP_WINDOW = 1;

@Injectable()
export class TwoFactorAuthService {
  private readonly logger = new Logger(TwoFactorAuthService.name);
  private readonly issuer = 'CaratFlow';

  constructor(private readonly prisma: PrismaService) {
    // Configure otplib authenticator defaults once
    authenticator.options = {
      step: TOTP_PERIOD,
      digits: TOTP_DIGITS,
      algorithm: HashAlgorithms.SHA1,
      window: TOTP_WINDOW,
    };
  }

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

    // Generate a random base32 secret via otplib (RFC 4648)
    const secret = authenticator.generateSecret(20);

    // Store the secret (not yet enabled until verification)
    await this.prisma.customerAuth.update({
      where: { id: customerAuthId },
      data: { twoFactorSecret: secret },
    });

    const accountName = customerAuth.email ?? customerAuth.phone ?? customerAuth.customer.firstName;
    const otpAuthUrl = authenticator.keyuri(accountName, this.issuer, secret);

    // Render a real QR code (PNG data URL) for clients that display the image directly.
    // On failure (e.g. a malformed secret), fall back to a lightweight SVG
    // representation so the public contract remains intact.
    let qrCodeDataUrl: string;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 256,
      });
    } catch (err) {
      this.logger.warn(`QR code generation failed, falling back to SVG: ${(err as Error).message}`);
      qrCodeDataUrl = `data:image/svg+xml;base64,${Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg"><text y="20">QR: ${otpAuthUrl}</text></svg>`,
      ).toString('base64')}`;
    }

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

  /**
   * Generate a fresh TOTP code for a given secret.
   * Primarily useful for debugging / test harnesses — not exposed publicly.
   */
  generateTotpFor(secret: string): string {
    return authenticator.generate(secret);
  }

  // ─── Private Helpers ─────────────────────────────────────────

  /**
   * Verify a TOTP code against a secret using otplib's HMAC-SHA1 based
   * RFC 6238 implementation. Allows a +/- 1 period drift window.
   */
  private verifyTotpCode(secret: string, code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    // otplib expects the code as a string of digits; empty/whitespace fails.
    const normalized = code.trim();
    if (!/^\d{6}$/.test(normalized)) return false;
    try {
      return authenticator.check(normalized, secret);
    } catch (err) {
      // Malformed secret or other issue — treat as invalid without leaking details.
      this.logger.warn(`TOTP verification threw: ${(err as Error).message}`);
      return false;
    }
  }
}
