import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { TenantAwareService } from '../../common/base.service';
import { Prisma } from '@caratflow/db';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
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
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  /** Invite a new user to the tenant. Generates a temporary password. */
  async inviteUser(tenantId: string, input: InviteUserInput, audit: AuditMeta) {
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: input.email } },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists in this tenant');
    }

    // Generate a temporary password -- in production, send invite link via email
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

    // Placeholder: In production, send invite email with tempPassword or a magic link
    console.warn(`[Platform] Invite sent to ${input.email} with temp password: ${tempPassword}`);

    return { ...user, tempPassword };
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
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
