import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  Optional,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { Prisma } from '@caratflow/db';
import { PrismaService } from '../common/prisma.service';
import type { JwtPayload } from '../common/tenant.middleware';
import { EmailService } from '../modules/crm/email.service';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Stored under User.preferences.__passwordReset (schema is not modified).
interface PasswordResetPreference {
  tokenHash: string;
  expiresAt: string; // ISO
}

// Reset token lives for 1 hour by default
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly emailService?: EmailService,
  ) {
    this.jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me-in-production';
    this.accessExpiry = process.env.JWT_ACCESS_EXPIRY ?? '15m';
    this.refreshExpiry = process.env.JWT_REFRESH_EXPIRY ?? '7d';
  }

  async register(input: {
    tenantId: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId?: string;
  }) {
    // Check if user already exists for this tenant
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: input.tenantId, email: input.email } },
    });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await this.prisma.user.create({
      data: {
        id: uuid(),
        tenantId: input.tenantId,
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        roleId: input.roleId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        tenantId: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(email: string, password: string, tenantSlug: string): Promise<TokenPair> {
    // Find tenant by slug
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Invalid tenant');
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      include: { role: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Parse permissions from role
    const permissions = this.extractPermissions(user.role?.permissions);

    return this.generateTokenPair(user.id, tenant.id, user.email, user.role?.name ?? 'user', permissions);
  }

  async refreshTokens(refreshTokenValue: string): Promise<TokenPair> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: { user: { include: { role: true } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke current refresh token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const { user } = stored;
    const permissions = this.extractPermissions(user.role?.permissions);

    return this.generateTokenPair(
      user.id,
      user.tenantId,
      user.email,
      user.role?.name ?? 'user',
      permissions,
    );
  }

  async logout(refreshTokenValue: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshTokenValue, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(email: string, tenantSlug: string): Promise<{ message: string }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    const genericResponse = { message: 'If an account exists, a reset link has been sent.' };

    if (!tenant) {
      // Don't reveal whether tenant exists
      return genericResponse;
    }

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });

    if (!user || !user.isActive) {
      // Constant-time-ish: still return generic message
      return genericResponse;
    }

    // Generate a cryptographically secure token (64 hex chars = 32 bytes)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    const preferences = this.mergeResetIntoPreferences(user.preferences, {
      tokenHash,
      expiresAt: expiresAt.toISOString(),
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { preferences: preferences as Prisma.InputJsonValue },
    });

    const webUrl = process.env.WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3000';
    // Embed user id alongside the token so reset can scope by user without leaking email.
    const resetUrl = `${webUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}&uid=${user.id}`;

    try {
      if (this.emailService) {
        await this.emailService.sendEmail(tenant.id, {
          to: user.email,
          subject: 'Reset your CaratFlow password',
          text:
            `Hi ${user.firstName},\n\n` +
            `We received a request to reset your password. Click the link below within 1 hour to choose a new one:\n\n` +
            `${resetUrl}\n\n` +
            `If you did not request this, you can safely ignore this email.\n`,
          html:
            `<p>Hi ${user.firstName},</p>` +
            `<p>We received a request to reset your password. Click the link below within 1 hour to choose a new one:</p>` +
            `<p><a href="${resetUrl}">${resetUrl}</a></p>` +
            `<p>If you did not request this, you can safely ignore this email.</p>`,
        });
      } else {
        this.logger.warn(
          `[AUTH] EmailService not available — reset link for ${user.email} not dispatched`,
        );
      }
    } catch (err) {
      // Do not leak provider errors to caller; log and return generic response.
      this.logger.error(`Failed to send password reset email: ${(err as Error).message}`);
    }

    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string, userId?: string): Promise<void> {
    if (!token || !newPassword) {
      throw new BadRequestException('Token and new password are required');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const tokenHash = this.hashToken(token);

    if (!userId) {
      // The reset link always includes uid; refuse ambiguous resets.
      throw new BadRequestException('Reset request is missing the user reference');
    }

    const candidate = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, preferences: true },
    });

    if (!candidate) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const pref = this.readResetPreference(candidate.preferences);
    if (!pref || pref.tokenHash !== tokenHash) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    if (new Date(pref.expiresAt).getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Clear the reset token from preferences and update password.
    const clearedPreferences = this.mergeResetIntoPreferences(candidate.preferences, null);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: candidate.id },
        data: {
          passwordHash,
          preferences: clearedPreferences as Prisma.InputJsonValue,
        },
      }),
      // Invalidate all active refresh tokens so existing sessions are revoked.
      this.prisma.refreshToken.updateMany({
        where: { userId: candidate.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.log(`Password reset completed for user ${candidate.id}`);
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private async generateTokenPair(
    userId: string,
    tenantId: string,
    email: string,
    role: string,
    permissions: string[],
  ): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: userId,
      tenantId,
      email,
      role,
      permissions,
    };

    const accessToken = jwt.sign(payload as object, this.jwtSecret, {
      expiresIn: this.accessExpiry as unknown as number,
    });

    const refreshTokenValue = uuid() + '-' + uuid();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        id: uuid(),
        userId,
        token: refreshTokenValue,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  private extractPermissions(permissionsJson: unknown): string[] {
    if (!permissionsJson || typeof permissionsJson !== 'object') return [];
    const result: string[] = [];
    for (const [key, value] of Object.entries(permissionsJson as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const action of value) {
          result.push(`${key}.${action}`);
        }
      } else {
        result.push(key);
      }
    }
    return result;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private readResetPreference(preferences: unknown): PasswordResetPreference | null {
    if (!preferences || typeof preferences !== 'object') return null;
    const bag = preferences as Record<string, unknown>;
    const raw = bag['__passwordReset'];
    if (!raw || typeof raw !== 'object') return null;
    const obj = raw as Record<string, unknown>;
    if (typeof obj['tokenHash'] !== 'string' || typeof obj['expiresAt'] !== 'string') return null;
    return { tokenHash: obj['tokenHash'], expiresAt: obj['expiresAt'] };
  }

  private mergeResetIntoPreferences(
    preferences: unknown,
    reset: PasswordResetPreference | null,
  ): Record<string, unknown> {
    const base =
      preferences && typeof preferences === 'object'
        ? ({ ...(preferences as Record<string, unknown>) } as Record<string, unknown>)
        : {};
    if (reset === null) {
      delete base['__passwordReset'];
    } else {
      base['__passwordReset'] = reset;
    }
    return base;
  }
}

