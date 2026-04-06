// ─── Pre-Order Config Service ─────────────────────────────────
// Admin configuration for per-product pre-order/backorder settings.

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type {
  PreOrderConfigInput,
  PreOrderConfigResponse,
  BulkPreOrderConfigInput,
} from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PreOrderConfigService extends TenantAwareService {
  private readonly logger = new Logger(PreOrderConfigService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Set or update pre-order configuration for a product.
   * Uses upsert to create or update.
   */
  async setPreOrderConfig(
    tenantId: string,
    userId: string,
    input: PreOrderConfigInput,
  ): Promise<PreOrderConfigResponse> {
    // Validate product exists
    const product = await this.prisma.product.findFirst({
      where: this.tenantWhere(tenantId, { id: input.productId }) as { tenantId: string; id: string },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const config = await this.prisma.preOrderConfig.upsert({
      where: { tenantId_productId: { tenantId, productId: input.productId } },
      create: {
        id: uuidv4(),
        tenantId,
        productId: input.productId,
        isPreOrderEnabled: input.isPreOrderEnabled ?? false,
        isBackorderEnabled: input.isBackorderEnabled ?? false,
        maxPreOrderQty: input.maxPreOrderQty ?? 0,
        depositPercentage: input.depositPercentage ?? 0,
        estimatedLeadDays: input.estimatedLeadDays ?? 14,
        autoConfirm: input.autoConfirm ?? false,
        customMessage: input.customMessage ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
      update: {
        isPreOrderEnabled: input.isPreOrderEnabled,
        isBackorderEnabled: input.isBackorderEnabled,
        maxPreOrderQty: input.maxPreOrderQty,
        depositPercentage: input.depositPercentage,
        estimatedLeadDays: input.estimatedLeadDays,
        autoConfirm: input.autoConfirm,
        customMessage: input.customMessage ?? null,
        updatedBy: userId,
      },
      include: { product: { select: { name: true } } },
    });

    this.logger.log(`[PreOrderConfig] Set config for product ${input.productId}`);
    return this.mapConfigToResponse(config);
  }

  /**
   * Get pre-order config for a specific product.
   */
  async getConfig(tenantId: string, productId: string): Promise<PreOrderConfigResponse> {
    const config = await this.prisma.preOrderConfig.findUnique({
      where: { tenantId_productId: { tenantId, productId } },
      include: { product: { select: { name: true } } },
    });
    if (!config) {
      throw new NotFoundException('Pre-order config not found for this product');
    }
    return this.mapConfigToResponse(config);
  }

  /**
   * List all pre-order configs for a tenant.
   */
  async listConfigs(tenantId: string): Promise<PreOrderConfigResponse[]> {
    const configs = await this.prisma.preOrderConfig.findMany({
      where: { tenantId },
      include: { product: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return configs.map((c) => this.mapConfigToResponse(c));
  }

  /**
   * Bulk enable pre-order/backorder for multiple products.
   */
  async bulkEnablePreOrder(
    tenantId: string,
    userId: string,
    input: BulkPreOrderConfigInput,
  ): Promise<{ updated: number; created: number }> {
    let updated = 0;
    let created = 0;

    for (const productId of input.productIds) {
      // Validate product exists
      const product = await this.prisma.product.findFirst({
        where: this.tenantWhere(tenantId, { id: productId }) as { tenantId: string; id: string },
      });
      if (!product) {
        this.logger.warn(`[PreOrderConfig] Bulk: product ${productId} not found, skipping`);
        continue;
      }

      const existing = await this.prisma.preOrderConfig.findUnique({
        where: { tenantId_productId: { tenantId, productId } },
      });

      if (existing) {
        await this.prisma.preOrderConfig.update({
          where: { tenantId_productId: { tenantId, productId } },
          data: {
            ...(input.config.isPreOrderEnabled != null && {
              isPreOrderEnabled: input.config.isPreOrderEnabled,
            }),
            ...(input.config.isBackorderEnabled != null && {
              isBackorderEnabled: input.config.isBackorderEnabled,
            }),
            ...(input.config.maxPreOrderQty != null && {
              maxPreOrderQty: input.config.maxPreOrderQty,
            }),
            ...(input.config.depositPercentage != null && {
              depositPercentage: input.config.depositPercentage,
            }),
            ...(input.config.estimatedLeadDays != null && {
              estimatedLeadDays: input.config.estimatedLeadDays,
            }),
            ...(input.config.autoConfirm != null && {
              autoConfirm: input.config.autoConfirm,
            }),
            ...(input.config.customMessage != null && {
              customMessage: input.config.customMessage,
            }),
            updatedBy: userId,
          },
        });
        updated++;
      } else {
        await this.prisma.preOrderConfig.create({
          data: {
            id: uuidv4(),
            tenantId,
            productId,
            isPreOrderEnabled: input.config.isPreOrderEnabled ?? false,
            isBackorderEnabled: input.config.isBackorderEnabled ?? false,
            maxPreOrderQty: input.config.maxPreOrderQty ?? 0,
            depositPercentage: input.config.depositPercentage ?? 0,
            estimatedLeadDays: input.config.estimatedLeadDays ?? 14,
            autoConfirm: input.config.autoConfirm ?? false,
            customMessage: input.config.customMessage ?? null,
            createdBy: userId,
            updatedBy: userId,
          },
        });
        created++;
      }
    }

    this.logger.log(
      `[PreOrderConfig] Bulk operation: updated=${updated}, created=${created}`,
    );
    return { updated, created };
  }

  /**
   * Delete a pre-order config (disable pre-ordering for a product).
   */
  async deleteConfig(tenantId: string, productId: string): Promise<{ success: boolean }> {
    const config = await this.prisma.preOrderConfig.findUnique({
      where: { tenantId_productId: { tenantId, productId } },
    });
    if (!config) {
      throw new NotFoundException('Pre-order config not found');
    }

    await this.prisma.preOrderConfig.delete({
      where: { tenantId_productId: { tenantId, productId } },
    });

    this.logger.log(`[PreOrderConfig] Deleted config for product ${productId}`);
    return { success: true };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapConfigToResponse(config: Record<string, unknown>): PreOrderConfigResponse {
    const c = config as Record<string, unknown>;
    const product = c.product as { name: string } | null;

    return {
      id: c.id as string,
      tenantId: c.tenantId as string,
      productId: c.productId as string,
      productName: product?.name ?? null,
      isPreOrderEnabled: c.isPreOrderEnabled as boolean,
      isBackorderEnabled: c.isBackorderEnabled as boolean,
      maxPreOrderQty: c.maxPreOrderQty as number,
      depositPercentage: c.depositPercentage as number,
      estimatedLeadDays: c.estimatedLeadDays as number,
      autoConfirm: c.autoConfirm as boolean,
      customMessage: (c.customMessage as string) ?? null,
      createdAt: new Date(c.createdAt as string),
      updatedAt: new Date(c.updatedAt as string),
    };
  }
}
