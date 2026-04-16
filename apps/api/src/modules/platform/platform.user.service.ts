import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { TenantAwareService } from '../../common/base.service';
import { Prisma } from '@caratflow/db';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { EmailService } from '../crm/email.service';
import type { PaginatedResult, AuditMeta } from '@caratflow/shared-types';

interface InviteUserInput {
  email: string;
  firstName: string;
  lastName: string;
  roleId?: string;
}

interface UpdateUserProfileInput {
  firstName?: string;
  lastName?: string;
  preferences?: Record<string, unknown>;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

interface ListUsersParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  isActive?: boolean;
}

/** Password policy configuration */
const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
} as const;

@Injectable()
export class PlatformUserService extends TenantAwareService {
  private readonly logger = new Logger(PlatformUserService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
    @Optional() private readonly emailService?: EmailService,
  ) {
    super(prisma);
  }

  /**
   * Invite a new user to the tenant. Generates a cryptographically
   * strong 12-char temp password, stores it bcrypt-hashed, flags the
   * user for forced password change on first login (via User.preferences),
   * and emails the temp credentials together with a login link.
   */
  async inviteUser(tenantId: string, input: InviteUserInput, audit: AuditMeta) {
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: input.email } },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists in this tenant');
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        id: uuid(),
        tenantId,
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        roleId: input.roleId ?? null,
        isActive: true,
        createdBy: audit.userId,
        // Flag the account so the web app can force a password change
        // on first login. No schema change required — stored in the
        // existing preferences JSON bag.
        preferences: { requirePasswordChange: true } as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        isActive: true,
        createdAt: true,
      },
    });

    await this.eventBus.publish({
      id: uuid(),
      tenantId,
      userId: audit.userId,
      timestamp: new Date().toISOString(),
      type: 'platform.user.created',
      payload: { userId: user.id, email: user.email, roleId: user.roleId ?? '' },
    });

    // Fire-and-forget email dispatch. Failures are logged but do not
    // undo the user creation — the admin can always re-trigger via
    // a password-reset flow. The temp password is still returned in
    // the response so automation/E2E tests can consume it.
    this.sendInviteEmail(tenantId, user.email, input.firstName, tempPassword).catch((err) => {
      this.logger.error(
        `Failed to dispatch invite email to ${input.email}: ${(err as Error).message}`,
      );
    });

    return { ...user, tempPassword };
  }

  /**
   * Send the invite email with the temp password and a login link.
   * Silent no-op if EmailService is not wired (e.g. unit tests).
   */
  private async sendInviteEmail(
    tenantId: string,
    email: string,
    firstName: string,
    tempPassword: string,
  ): Promise<void> {
    if (!this.emailService) {
      this.logger.warn(
        `[Platform] EmailService not wired — invite for ${email} (temp password ${tempPassword}) logged only`,
      );
      return;
    }

    const webUrl = (
      process.env.WEB_URL ??
      process.env.NEXT_PUBLIC_WEB_URL ??
      'http://localhost:3000'
    ).replace(/\/$/, '');
    const loginUrl = `${webUrl}/auth/login`;

    const subject = 'You have been invited to CaratFlow';
    const text =
      `Hi ${firstName},\n\n` +
      `You have been invited to CaratFlow. Use the temporary password below to sign in — you will be asked to set a new one on first login.\n\n` +
      `Login URL: ${loginUrl}\n` +
      `Email: ${email}\n` +
      `Temporary password: ${tempPassword}\n\n` +
      `If you did not expect this invitation, please ignore this email.\n`;
    const html =
      `<p>Hi ${firstName},</p>` +
      `<p>You have been invited to <strong>CaratFlow</strong>. Use the temporary password below to sign in — you will be asked to set a new one on first login.</p>` +
      `<ul>` +
      `<li>Login URL: <a href="${loginUrl}">${loginUrl}</a></li>` +
      `<li>Email: <code>${email}</code></li>` +
      `<li>Temporary password: <code>${tempPassword}</code></li>` +
      `</ul>` +
      `<p>If you did not expect this invitation, please ignore this email.</p>`;

    await this.emailService.sendEmail(tenantId, {
      to: email,
      subject,
      text,
      html,
    });
  }

  /** List users for a tenant with pagination and search. */
  async listUsers(
    tenantId: string,
    params: ListUsersParams,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc', search, isActive } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          roleId: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          role: { select: { id: true, name: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /** Get a single user by ID within tenant. */
  async getUserById(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: this.tenantWhere(tenantId, { id: userId }),
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roleId: true,
        isActive: true,
        lastLoginAt: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { id: true, name: true, permissions: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /** Activate a user account. */
  async activateUser(tenantId: string, userId: string, audit: AuditMeta) {
    await this.ensureUserExists(tenantId, userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true, updatedBy: audit.userId },
      select: { id: true, email: true, isActive: true },
    });
  }

  /** Deactivate a user account. */
  async deactivateUser(tenantId: string, userId: string, audit: AuditMeta) {
    if (userId === audit.userId) {
      throw new BadRequestException('Cannot deactivate your own account');
    }
    await this.ensureUserExists(tenantId, userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, updatedBy: audit.userId },
      select: { id: true, email: true, isActive: true },
    });
  }

  /** Update user profile fields. */
  async updateProfile(tenantId: string, userId: string, input: UpdateUserProfileInput, audit: AuditMeta) {
    await this.ensureUserExists(tenantId, userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(input.preferences !== undefined && { preferences: input.preferences as Prisma.InputJsonValue }),
        updatedBy: audit.userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        preferences: true,
        updatedAt: true,
      },
    });
  }

  /** Change user password with validation against policy. */
  async changePassword(tenantId: string, userId: string, input: ChangePasswordInput) {
    const user = await this.prisma.user.findFirst({
      where: this.tenantWhere(tenantId, { id: userId }),
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const validCurrent = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!validCurrent) {
      throw new BadRequestException('Current password is incorrect');
    }

    this.enforcePasswordPolicy(input.newPassword);

    const newHash = await bcrypt.hash(input.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true };
  }

  /** Validate a password against the password policy. */
  enforcePasswordPolicy(password: string): void {
    const errors: string[] = [];

    if (password.length < PASSWORD_POLICY.minLength) {
      errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
    }
    if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (PASSWORD_POLICY.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private async ensureUserExists(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: this.tenantWhere(tenantId, { id: userId }),
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private generateTempPassword(): string {
    // Cryptographically strong 12-character temp password drawn from a
    // set that avoids visually-ambiguous glyphs (0/O, 1/l/I).
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    const bytes = crypto.randomBytes(12);
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(bytes[i]! % chars.length);
    }
    return password;
  }
}
