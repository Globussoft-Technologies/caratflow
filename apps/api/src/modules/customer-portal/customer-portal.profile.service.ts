// ─── Customer Portal Profile Service ──────────────────────────
// Profile management: view, update, change password, notification
// preferences, account deletion for B2C customers.

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import * as bcrypt from 'bcryptjs';
import type {
  CustomerProfileResponse,
  UpdateProfileInput,
  ChangePasswordInput,
  NotificationPreferencesInput,
} from '@caratflow/shared-types';
import type { Prisma } from '@caratflow/db';

/** Number of days before PII is permanently anonymized after soft-delete */
const PII_RETENTION_DAYS = 30;
const BCRYPT_ROUNDS = 12;

@Injectable()
export class CustomerPortalProfileService extends TenantAwareService {
  private readonly logger = new Logger(CustomerPortalProfileService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Get Profile ────────────────────────────────────────────────

  async getProfile(tenantId: string, customerId: string): Promise<CustomerProfileResponse> {
    const customer = await this.prisma.customer.findFirst({
      where: this.tenantWhere(tenantId, { id: customerId }) as Prisma.CustomerWhereInput,
      include: { customerAuth: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    return {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      alternatePhone: customer.alternatePhone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      country: customer.country,
      postalCode: customer.postalCode,
      dateOfBirth: customer.dateOfBirth,
      anniversary: customer.anniversary,
      loyaltyPoints: customer.loyaltyPoints,
      loyaltyTier: customer.loyaltyTier,
      preferences: customer.preferences,
      isEmailVerified: customer.customerAuth?.isEmailVerified ?? false,
      isPhoneVerified: customer.customerAuth?.isPhoneVerified ?? false,
      createdAt: customer.createdAt,
    };
  }

  // ─── Update Profile ─────────────────────────────────────────────

  async updateProfile(
    tenantId: string,
    customerId: string,
    input: UpdateProfileInput,
  ): Promise<CustomerProfileResponse> {
    const customer = await this.prisma.customer.findFirst({
      where: this.tenantWhere(tenantId, { id: customerId }) as Prisma.CustomerWhereInput,
    });
    if (!customer) throw new NotFoundException('Customer not found');

    // If email or phone changes, flag for re-verification
    const emailChanged = input.email !== undefined && input.email !== customer.email;
    const phoneChanged = input.phone !== undefined && input.phone !== customer.phone;

    await this.prisma.$transaction(async (tx) => {
      // Update customer record
      await tx.customer.update({
        where: { id: customerId },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          alternatePhone: input.alternatePhone,
          address: input.address,
          city: input.city,
          state: input.state,
          country: input.country,
          postalCode: input.postalCode,
          dateOfBirth: input.dateOfBirth,
          anniversary: input.anniversary,
          preferences: input.preferences as Prisma.InputJsonValue,
          updatedBy: customerId,
        },
      });

      // If email/phone changed, update auth record and mark unverified
      if (emailChanged || phoneChanged) {
        const authUpdate: Record<string, unknown> = {};
        if (emailChanged) {
          authUpdate.email = input.email;
          authUpdate.isEmailVerified = false;
        }
        if (phoneChanged) {
          authUpdate.phone = input.phone;
          authUpdate.isPhoneVerified = false;
        }

        await tx.customerAuth.updateMany({
          where: { customerId },
          data: authUpdate as Prisma.CustomerAuthUpdateManyMutationInput,
        });
      }
    });

    if (emailChanged) {
      this.logger.log(`Customer ${customerId} email changed -- re-verification needed`);
    }
    if (phoneChanged) {
      this.logger.log(`Customer ${customerId} phone changed -- re-verification needed`);
    }

    return this.getProfile(tenantId, customerId);
  }

  // ─── Change Password ────────────────────────────────────────────

  async changePassword(
    tenantId: string,
    customerId: string,
    input: ChangePasswordInput,
  ): Promise<void> {
    const auth = await this.prisma.customerAuth.findFirst({
      where: { customerId },
    });
    if (!auth) throw new NotFoundException('Customer auth record not found');
    if (!auth.passwordHash) {
      throw new BadRequestException('Account uses social login -- no password to change');
    }

    const isCurrentValid = await bcrypt.compare(input.currentPassword, auth.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (input.currentPassword === input.newPassword) {
      throw new BadRequestException('New password must differ from current password');
    }

    const newHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);

    await this.prisma.customerAuth.update({
      where: { id: auth.id },
      data: { passwordHash: newHash },
    });

    this.logger.log(`Customer ${customerId} changed password`);
  }

  // ─── Notification Preferences ───────────────────────────────────

  async getNotificationPreferences(
    tenantId: string,
    customerId: string,
  ): Promise<NotificationPreferencesInput> {
    const customer = await this.prisma.customer.findFirst({
      where: this.tenantWhere(tenantId, { id: customerId }) as Prisma.CustomerWhereInput,
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const prefs = customer.preferences as Record<string, unknown> | null;
    const notifPrefs = (prefs?.notificationPreferences ?? {}) as NotificationPreferencesInput;

    // Return defaults merged with stored preferences
    const defaults = {
      orders: { email: true, sms: true, whatsapp: false, push: true },
      promotions: { email: true, sms: false, whatsapp: false, push: true },
      schemes: { email: true, sms: true, whatsapp: false, push: true },
      loyalty: { email: true, sms: false, whatsapp: false, push: true },
      reminders: { email: true, sms: true, whatsapp: false, push: true },
    } as const;

    return {
      orders: { ...defaults.orders, ...(notifPrefs.orders ?? {}) },
      promotions: { ...defaults.promotions, ...(notifPrefs.promotions ?? {}) },
      schemes: { ...defaults.schemes, ...(notifPrefs.schemes ?? {}) },
      loyalty: { ...defaults.loyalty, ...(notifPrefs.loyalty ?? {}) },
      reminders: { ...defaults.reminders, ...(notifPrefs.reminders ?? {}) },
    };
  }

  async updateNotificationPreferences(
    tenantId: string,
    customerId: string,
    preferences: NotificationPreferencesInput,
  ): Promise<NotificationPreferencesInput> {
    const customer = await this.prisma.customer.findFirst({
      where: this.tenantWhere(tenantId, { id: customerId }) as Prisma.CustomerWhereInput,
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const existingPrefs = (customer.preferences as Record<string, unknown>) ?? {};
    const updatedPrefs = {
      ...existingPrefs,
      notificationPreferences: preferences,
    };

    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        preferences: updatedPrefs as Prisma.InputJsonValue,
        updatedBy: customerId,
      },
    });

    return this.getNotificationPreferences(tenantId, customerId);
  }

  // ─── Delete Account (Soft) ──────────────────────────────────────

  async deleteAccount(tenantId: string, customerId: string): Promise<{ message: string }> {
    const customer = await this.prisma.customer.findFirst({
      where: this.tenantWhere(tenantId, { id: customerId }) as Prisma.CustomerWhereInput,
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const existingPrefs = (customer.preferences as Record<string, unknown>) ?? {};

    await this.prisma.$transaction(async (tx) => {
      // Soft-delete: mark the account as deleted with a scheduled PII anonymization date
      const piiAnonymizeAt = new Date();
      piiAnonymizeAt.setDate(piiAnonymizeAt.getDate() + PII_RETENTION_DAYS);

      await tx.customer.update({
        where: { id: customerId },
        data: {
          preferences: {
            ...existingPrefs,
            accountDeleted: true,
            deletedAt: new Date().toISOString(),
            piiAnonymizeAt: piiAnonymizeAt.toISOString(),
          } as Prisma.InputJsonValue,
          updatedBy: customerId,
        },
      });

      // Revoke all refresh tokens to log out all sessions
      await tx.customerRefreshToken.updateMany({
        where: {
          customerAuth: { customerId },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    });

    this.logger.log(
      `Customer ${customerId} requested account deletion -- PII anonymization scheduled in ${PII_RETENTION_DAYS} days`,
    );

    return {
      message: `Account scheduled for deletion. Your personal data will be anonymized after ${PII_RETENTION_DAYS} days.`,
    };
  }
}
