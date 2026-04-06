import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../common/prisma.service';
import type { OtpPurpose } from '@caratflow/db';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  /** OTP validity duration in minutes */
  private readonly OTP_EXPIRY_MINUTES = 5;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a 6-digit OTP, store it, and trigger delivery.
   * Returns the OTP in development for testing; in production only sends via SMS/email.
   */
  async generateOtp(
    identifier: string,
    purpose: OtpPurpose,
  ): Promise<{ message: string; otp?: string }> {
    // Invalidate any existing unexpired OTPs for this identifier + purpose
    await this.prisma.otpVerification.updateMany({
      where: {
        identifier,
        purpose,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { expiresAt: new Date() }, // expire them immediately
    });

    const otpCode = this.generateSecureOtp();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    await this.prisma.otpVerification.create({
      data: {
        id: uuid(),
        identifier,
        otpCode,
        purpose,
        expiresAt,
      },
    });

    // Placeholder for SMS/email delivery
    // In production, integrate MSG91/Twilio for SMS or SES/SendGrid for email
    await this.sendOtp(identifier, otpCode);

    const isDevelopment = process.env.NODE_ENV !== 'production';
    return {
      message: 'OTP sent successfully',
      // Only expose the OTP in non-production environments for testing
      ...(isDevelopment ? { otp: otpCode } : {}),
    };
  }

  /**
   * Verify an OTP. Returns true if valid, throws on failure.
   */
  async verifyOtp(
    identifier: string,
    otp: string,
    purpose: OtpPurpose,
  ): Promise<boolean> {
    const record = await this.prisma.otpVerification.findFirst({
      where: {
        identifier,
        purpose,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('No valid OTP found. Please request a new one.');
    }

    // Check max attempts
    if (record.attempts >= record.maxAttempts) {
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    // Increment attempts
    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });

    if (record.otpCode !== otp) {
      const remaining = record.maxAttempts - record.attempts - 1;
      throw new BadRequestException(
        `Invalid OTP. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'No attempts remaining. Please request a new OTP.'}`,
      );
    }

    // Mark as verified
    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { verifiedAt: new Date() },
    });

    return true;
  }

  /**
   * Cleanup expired OTP records. Called via BullMQ cron.
   */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await this.prisma.otpVerification.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { verifiedAt: { not: null } },
        ],
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired/verified OTP records`);
    return result.count;
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private generateSecureOtp(): string {
    // Generate a cryptographically random 6-digit OTP
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const otp = (array[0] % 900000) + 100000;
    return otp.toString();
  }

  private async sendOtp(identifier: string, otpCode: string): Promise<void> {
    // Determine if identifier is email or phone
    const isEmail = identifier.includes('@');

    if (isEmail) {
      // TODO: Integrate with email service (SES/SendGrid)
      this.logger.warn(`[OTP] Email OTP for ${identifier}: ${otpCode}`);
    } else {
      // TODO: Integrate with SMS service (MSG91/Twilio)
      this.logger.warn(`[OTP] SMS OTP for ${identifier}: ${otpCode}`);
    }
  }
}
