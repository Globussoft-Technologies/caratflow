import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../common/prisma.service';
import type { JwtPayload } from '../common/tenant.middleware';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;

  constructor(private readonly prisma: PrismaService) {
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
    if (!tenant) {
      // Don't reveal whether tenant exists
      return { message: 'If an account exists, a reset link has been sent.' };
    }

    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });

    if (user) {
      // In production, generate a reset token and send email.
      // For now, just log it.
      const resetToken = uuid();
      console.warn(`[AUTH] Password reset token for ${email}: ${resetToken}`);
      // TODO: Send email via notification service
    }

    return { message: 'If an account exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // In production, validate the reset token from DB/cache
    // For now, this is a placeholder
    throw new NotFoundException('Password reset not yet implemented with persistent tokens');
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

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessExpiry,
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
}
