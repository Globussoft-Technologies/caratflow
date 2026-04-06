// ─── 360 Product View Service ─────────────────────────────────
// Manages 360-degree spin configurations for products.

import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Product360Config,
  Product360ConfigInput,
  Product360ConfigUpdate,
} from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class Ar360Service extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Create a 360 spin configuration for a product.
   */
  async create360Config(
    tenantId: string,
    userId: string,
    input: Product360ConfigInput,
  ): Promise<Product360Config> {
    // Verify product exists
    const product = await this.prisma.product.findFirst({
      where: this.tenantWhere(tenantId, { id: input.productId }) as { tenantId: string; id: string },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if config already exists -- upsert
    const existing = await this.prisma.product360.findFirst({
      where: { tenantId, productId: input.productId },
    });

    if (existing) {
      const updated = await this.prisma.product360.update({
        where: { id: existing.id },
        data: {
          imageUrls: input.imageUrls,
          frameCount: input.frameCount,
          autoRotate: input.autoRotate,
          rotationSpeed: input.rotationSpeed,
          backgroundColor: input.backgroundColor,
          zoomEnabled: input.zoomEnabled,
          updatedBy: userId,
        },
      });
      return this.mapToConfig(updated);
    }

    const config = await this.prisma.product360.create({
      data: {
        id: uuidv4(),
        tenantId,
        productId: input.productId,
        imageUrls: input.imageUrls,
        frameCount: input.frameCount,
        autoRotate: input.autoRotate,
        rotationSpeed: input.rotationSpeed,
        backgroundColor: input.backgroundColor,
        zoomEnabled: input.zoomEnabled,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapToConfig(config);
  }

  /**
   * Get 360 configuration for a product.
   */
  async get360Config(tenantId: string, productId: string): Promise<Product360Config | null> {
    const config = await this.prisma.product360.findFirst({
      where: { tenantId, productId },
    });

    if (!config) {
      return null;
    }

    return this.mapToConfig(config);
  }

  /**
   * Update 360 configuration for a product.
   */
  async update360Config(
    tenantId: string,
    userId: string,
    productId: string,
    data: Product360ConfigUpdate,
  ): Promise<Product360Config> {
    const existing = await this.prisma.product360.findFirst({
      where: { tenantId, productId },
    });

    if (!existing) {
      throw new NotFoundException('360 configuration not found for this product');
    }

    const updated = await this.prisma.product360.update({
      where: { id: existing.id },
      data: {
        ...(data.imageUrls !== undefined && { imageUrls: data.imageUrls }),
        ...(data.frameCount !== undefined && { frameCount: data.frameCount }),
        ...(data.autoRotate !== undefined && { autoRotate: data.autoRotate }),
        ...(data.rotationSpeed !== undefined && { rotationSpeed: data.rotationSpeed }),
        ...(data.backgroundColor !== undefined && { backgroundColor: data.backgroundColor }),
        ...(data.zoomEnabled !== undefined && { zoomEnabled: data.zoomEnabled }),
        updatedBy: userId,
      },
    });

    return this.mapToConfig(updated);
  }

  /**
   * Delete 360 configuration for a product.
   */
  async delete360Config(tenantId: string, productId: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.product360.findFirst({
      where: { tenantId, productId },
    });

    if (!existing) {
      throw new NotFoundException('360 configuration not found for this product');
    }

    await this.prisma.product360.delete({
      where: { id: existing.id },
    });

    return { success: true };
  }

  /**
   * List all products with 360 configurations.
   */
  async listAll360Configs(tenantId: string): Promise<Product360Config[]> {
    const configs = await this.prisma.product360.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return configs.map((c) => this.mapToConfig(c));
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapToConfig(record: Record<string, unknown>): Product360Config {
    return {
      id: record.id as string,
      productId: record.productId as string,
      imageUrls: record.imageUrls as string[],
      frameCount: record.frameCount as number,
      autoRotate: record.autoRotate as boolean,
      rotationSpeed: record.rotationSpeed as number,
      backgroundColor: record.backgroundColor as string,
      zoomEnabled: record.zoomEnabled as boolean,
    };
  }
}
