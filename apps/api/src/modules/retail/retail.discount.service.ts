// ─── Retail Discount Service ───────────────────────────────────
// CRUD for discount rules and validation logic.

import { Injectable, NotFoundException } from '@nestjs/common';
import type { DiscountInput, DiscountResponse } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { RetailDiscountType } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RetailDiscountService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createDiscount(tenantId: string, userId: string, input: DiscountInput): Promise<DiscountResponse> {
    const discount = await this.prisma.discount.create({
      data: {
        id: uuidv4(),
        tenantId,
        name: input.name,
        discountType: input.discountType,
        value: input.value,
        minPurchasePaise: input.minPurchasePaise ? BigInt(input.minPurchasePaise) : null,
        maxDiscountPaise: input.maxDiscountPaise ? BigInt(input.maxDiscountPaise) : null,
        applicableCategories: input.applicableCategories ?? null,
        applicableProducts: input.applicableProducts ?? null,
        startDate: input.startDate,
        endDate: input.endDate,
        isActive: input.isActive ?? true,
        usageLimit: input.usageLimit ?? null,
        usedCount: 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapToResponse(discount);
  }

  async updateDiscount(
    tenantId: string,
    userId: string,
    discountId: string,
    input: Partial<DiscountInput>,
  ): Promise<DiscountResponse> {
    const existing = await this.prisma.discount.findFirst({
      where: this.tenantWhere(tenantId, { id: discountId }) as { tenantId: string; id: string },
    });

    if (!existing) throw new NotFoundException('Discount not found');

    const updateData: Record<string, unknown> = { updatedBy: userId };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.discountType !== undefined) updateData.discountType = input.discountType;
    if (input.value !== undefined) updateData.value = input.value;
    if (input.minPurchasePaise !== undefined) updateData.minPurchasePaise = input.minPurchasePaise ? BigInt(input.minPurchasePaise) : null;
    if (input.maxDiscountPaise !== undefined) updateData.maxDiscountPaise = input.maxDiscountPaise ? BigInt(input.maxDiscountPaise) : null;
    if (input.applicableCategories !== undefined) updateData.applicableCategories = input.applicableCategories;
    if (input.applicableProducts !== undefined) updateData.applicableProducts = input.applicableProducts;
    if (input.startDate !== undefined) updateData.startDate = input.startDate;
    if (input.endDate !== undefined) updateData.endDate = input.endDate;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.usageLimit !== undefined) updateData.usageLimit = input.usageLimit;

    const updated = await this.prisma.discount.update({
      where: { id: discountId },
      data: updateData,
    });

    return this.mapToResponse(updated);
  }

  async deleteDiscount(tenantId: string, discountId: string): Promise<void> {
    const existing = await this.prisma.discount.findFirst({
      where: this.tenantWhere(tenantId, { id: discountId }) as { tenantId: string; id: string },
    });

    if (!existing) throw new NotFoundException('Discount not found');

    await this.prisma.discount.update({
      where: { id: discountId },
      data: { isActive: false },
    });
  }

  async getDiscount(tenantId: string, discountId: string): Promise<DiscountResponse> {
    const discount = await this.prisma.discount.findFirst({
      where: this.tenantWhere(tenantId, { id: discountId }) as { tenantId: string; id: string },
    });

    if (!discount) throw new NotFoundException('Discount not found');
    return this.mapToResponse(discount);
  }

  async listDiscounts(
    tenantId: string,
    filters: { isActive?: boolean },
    pagination: Pagination,
  ): Promise<PaginatedResult<DiscountResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    const [items, total] = await Promise.all([
      this.prisma.discount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.discount.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((d) => this.mapToResponse(d)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Get all active discounts valid right now for use in POS.
   */
  async getActiveDiscounts(tenantId: string): Promise<DiscountResponse[]> {
    const now = new Date();
    const discounts = await this.prisma.discount.findMany({
      where: {
        tenantId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { name: 'asc' },
    });

    return discounts.map((d) => this.mapToResponse(d));
  }

  /**
   * Increment usage count when a discount is used.
   */
  async incrementUsage(tenantId: string, discountId: string): Promise<void> {
    await this.prisma.discount.update({
      where: { id: discountId },
      data: { usedCount: { increment: 1 } },
    });
  }

  private mapToResponse(discount: Record<string, unknown>): DiscountResponse {
    return {
      id: discount.id as string,
      tenantId: discount.tenantId as string,
      name: discount.name as string,
      discountType: discount.discountType as RetailDiscountType,
      value: discount.value as number,
      minPurchasePaise: discount.minPurchasePaise ? Number(discount.minPurchasePaise) : null,
      maxDiscountPaise: discount.maxDiscountPaise ? Number(discount.maxDiscountPaise) : null,
      applicableCategories: discount.applicableCategories ?? null,
      applicableProducts: discount.applicableProducts ?? null,
      startDate: new Date(discount.startDate as string),
      endDate: new Date(discount.endDate as string),
      isActive: discount.isActive as boolean,
      usageLimit: (discount.usageLimit as number) ?? null,
      usedCount: discount.usedCount as number,
      createdAt: new Date(discount.createdAt as string),
      updatedAt: new Date(discount.updatedAt as string),
    };
  }
}
