// ─── BNPL Saved Payment Method Service ────────────────────────
// Manage tokenized saved payment methods (cards, UPI, wallets).

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type {
  SavedPaymentMethodInput,
  SavedPaymentMethodResponse,
} from '@caratflow/shared-types';
import { SavedMethodType, SavedCardType } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BnplSavedPaymentService extends TenantAwareService {
  private readonly logger = new Logger(BnplSavedPaymentService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Save Method ──────────────────────────────────────────────

  async saveMethod(
    tenantId: string,
    customerId: string,
    input: SavedPaymentMethodInput,
  ): Promise<SavedPaymentMethodResponse> {
    // If setting as default, unset other defaults for this customer
    if (input.isDefault) {
      await this.prisma.savedPaymentMethod.updateMany({
        where: { tenantId, customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if this is the customer's first saved method -- make it default
    const existingCount = await this.prisma.savedPaymentMethod.count({
      where: { tenantId, customerId },
    });
    const shouldBeDefault = input.isDefault ?? existingCount === 0;

    const method = await this.prisma.savedPaymentMethod.create({
      data: {
        id: uuidv4(),
        tenantId,
        customerId,
        methodType: input.methodType,
        displayName: input.displayName,
        last4: input.last4 ?? null,
        cardBrand: input.cardBrand ?? null,
        cardType: input.cardType ?? null,
        upiId: input.upiId ?? null,
        walletProvider: input.walletProvider ?? null,
        tokenReference: input.tokenReference,
        isDefault: shouldBeDefault,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });

    this.logger.log(`Saved payment method created: ${method.id} for customer ${customerId}`);

    return this.mapMethodToResponse(method);
  }

  // ─── List Methods ─────────────────────────────────────────────

  async listMethods(tenantId: string, customerId: string): Promise<SavedPaymentMethodResponse[]> {
    const methods = await this.prisma.savedPaymentMethod.findMany({
      where: { tenantId, customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    // Filter out expired methods
    const now = new Date();
    const validMethods = methods.filter(
      (m) => !m.expiresAt || m.expiresAt > now,
    );

    return validMethods.map((m) => this.mapMethodToResponse(m));
  }

  // ─── Set Default ──────────────────────────────────────────────

  async setDefault(tenantId: string, customerId: string, methodId: string): Promise<SavedPaymentMethodResponse> {
    const method = await this.prisma.savedPaymentMethod.findFirst({
      where: { id: methodId, tenantId, customerId },
    });
    if (!method) {
      throw new NotFoundException('Saved payment method not found');
    }

    // Unset all other defaults for this customer
    await this.prisma.savedPaymentMethod.updateMany({
      where: { tenantId, customerId, isDefault: true, id: { not: methodId } },
      data: { isDefault: false },
    });

    const updated = await this.prisma.savedPaymentMethod.update({
      where: { id: methodId },
      data: { isDefault: true },
    });

    return this.mapMethodToResponse(updated);
  }

  // ─── Remove Method ────────────────────────────────────────────

  async removeMethod(tenantId: string, customerId: string, methodId: string): Promise<void> {
    const method = await this.prisma.savedPaymentMethod.findFirst({
      where: { id: methodId, tenantId, customerId },
    });
    if (!method) {
      throw new NotFoundException('Saved payment method not found');
    }

    await this.prisma.savedPaymentMethod.delete({ where: { id: methodId } });

    // If this was the default, promote the next method
    if (method.isDefault) {
      const nextMethod = await this.prisma.savedPaymentMethod.findFirst({
        where: { tenantId, customerId },
        orderBy: { createdAt: 'asc' },
      });
      if (nextMethod) {
        await this.prisma.savedPaymentMethod.update({
          where: { id: nextMethod.id },
          data: { isDefault: true },
        });
      }
    }

    this.logger.log(`Saved payment method removed: ${methodId} for customer ${customerId}`);
  }

  // ─── Get Default Method ───────────────────────────────────────

  async getDefaultMethod(tenantId: string, customerId: string): Promise<SavedPaymentMethodResponse | null> {
    const method = await this.prisma.savedPaymentMethod.findFirst({
      where: { tenantId, customerId, isDefault: true },
    });

    if (!method) {
      return null;
    }

    // Check expiry
    if (method.expiresAt && method.expiresAt <= new Date()) {
      return null;
    }

    return this.mapMethodToResponse(method);
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapMethodToResponse(m: Record<string, unknown>): SavedPaymentMethodResponse {
    return {
      id: m.id as string,
      tenantId: m.tenantId as string,
      customerId: m.customerId as string,
      methodType: m.methodType as SavedMethodType,
      displayName: m.displayName as string,
      last4: (m.last4 as string) ?? null,
      cardBrand: (m.cardBrand as string) ?? null,
      cardType: (m.cardType as SavedCardType) ?? null,
      upiId: (m.upiId as string) ?? null,
      walletProvider: (m.walletProvider as string) ?? null,
      isDefault: m.isDefault as boolean,
      expiresAt: m.expiresAt ? new Date(m.expiresAt as string) : null,
      createdAt: new Date(m.createdAt as string),
      updatedAt: new Date(m.updatedAt as string),
    };
  }
}
