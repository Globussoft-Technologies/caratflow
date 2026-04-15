// ─── Storefront Coupon Service ─────────────────────────────────
// Coupon code validation, application, and admin CRUD.

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type {
  CouponValidationResult,
  CouponCodeInput,
  CouponCodeResponse,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorefrontCouponService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Validate a coupon code against the current cart total and customer.
   */
  async validateCoupon(
    tenantId: string,
    code: string,
    cartTotalPaise: number,
    customerId: string | null,
  ): Promise<CouponValidationResult> {
    const coupon = await this.prisma.couponCode.findUnique({
      where: { tenantId_code: { tenantId, code: code.toUpperCase() } },
    });

    if (!coupon) {
      return {
        valid: false,
        discountPaise: 0,
        errorMessage: 'Coupon code not found',
      };
    }

    if (!coupon.isActive) {
      return {
        valid: false,
        discountPaise: 0,
        errorMessage: 'Coupon code is inactive',
      };
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validTo) {
      return {
        valid: false,
        discountPaise: 0,
        errorMessage: 'Coupon code has expired or is not yet valid',
      };
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return {
        valid: false,
        discountPaise: 0,
        errorMessage: 'Coupon code usage limit reached',
      };
    }

    if (coupon.minOrderPaise && cartTotalPaise < Number(coupon.minOrderPaise)) {
      return {
        valid: false,
        discountPaise: 0,
        errorMessage: `Minimum order amount not met. Required: ${Number(coupon.minOrderPaise)} paise`,
      };
    }

    // Check first-order-only restriction
    if (coupon.isFirstOrderOnly && customerId) {
      const previousOrders = await this.prisma.onlineOrder.count({
        where: {
          tenantId,
          customerId,
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      });
      if (previousOrders > 0) {
        return {
          valid: false,
          discountPaise: 0,
          errorMessage: 'This coupon is valid for first orders only',
        };
      }
    }

    // Calculate discount
    const discountAmount = this.calculateDiscount(coupon, cartTotalPaise);

    return {
      valid: true,
      discountPaise: discountAmount,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description ?? null,
        discountType: coupon.discountType as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING',
        discountValue: coupon.discountValue,
      },
    };
  }

  /**
   * Apply a coupon and calculate the discount amount.
   * Does NOT increment usedCount (that happens at checkout).
   */
  async applyCoupon(
    tenantId: string,
    code: string,
    cartTotalPaise: number,
  ): Promise<CouponValidationResult> {
    const coupon = await this.prisma.couponCode.findUnique({
      where: { tenantId_code: { tenantId, code: code.toUpperCase() } },
    });

    if (!coupon || !coupon.isActive) {
      return {
        valid: false,
        discountPaise: 0,
        errorMessage: 'Invalid coupon',
      };
    }

    const discountAmount = this.calculateDiscount(coupon, cartTotalPaise);

    return {
      valid: true,
      discountPaise: discountAmount,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description ?? null,
        discountType: coupon.discountType as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING',
        discountValue: coupon.discountValue,
      },
    };
  }

  /**
   * Increment the usage count after a successful checkout.
   */
  async incrementUsage(tenantId: string, code: string): Promise<void> {
    await this.prisma.couponCode.update({
      where: { tenantId_code: { tenantId, code: code.toUpperCase() } },
      data: { usedCount: { increment: 1 } },
    });
  }

  // ─── Admin CRUD ─────────────────────────────────────────────────

  async createCoupon(
    tenantId: string,
    userId: string,
    input: CouponCodeInput,
  ): Promise<CouponCodeResponse> {
    const existing = await this.prisma.couponCode.findUnique({
      where: { tenantId_code: { tenantId, code: input.code.toUpperCase() } },
    });
    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }

    const coupon = await this.prisma.couponCode.create({
      data: {
        id: uuidv4(),
        tenantId,
        code: input.code.toUpperCase(),
        description: input.description ?? null,
        discountType: input.discountType,
        discountValue: input.discountValue,
        minOrderPaise: input.minOrderPaise ? BigInt(input.minOrderPaise) : null,
        maxDiscountPaise: input.maxDiscountPaise ? BigInt(input.maxDiscountPaise) : null,
        usageLimit: input.usageLimit,
        validFrom: input.validFrom,
        validTo: input.validTo,
        isActive: input.isActive ?? true,
        applicableCategories: input.applicableCategories ?? undefined,
        applicableProducts: input.applicableProducts ?? undefined,
        isFirstOrderOnly: input.isFirstOrderOnly ?? false,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapCouponToResponse(coupon);
  }

  async updateCoupon(
    tenantId: string,
    userId: string,
    couponId: string,
    input: Partial<CouponCodeInput>,
  ): Promise<CouponCodeResponse> {
    const existing = await this.prisma.couponCode.findFirst({
      where: { id: couponId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Coupon not found');
    }

    const data: Record<string, unknown> = { updatedBy: userId };
    if (input.description !== undefined) data.description = input.description;
    if (input.discountType !== undefined) data.discountType = input.discountType;
    if (input.discountValue !== undefined) data.discountValue = input.discountValue;
    if (input.minOrderPaise !== undefined) data.minOrderPaise = input.minOrderPaise ? BigInt(input.minOrderPaise) : null;
    if (input.maxDiscountPaise !== undefined) data.maxDiscountPaise = input.maxDiscountPaise ? BigInt(input.maxDiscountPaise) : null;
    if (input.usageLimit !== undefined) data.usageLimit = input.usageLimit;
    if (input.validFrom !== undefined) data.validFrom = input.validFrom;
    if (input.validTo !== undefined) data.validTo = input.validTo;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.applicableCategories !== undefined) data.applicableCategories = input.applicableCategories;
    if (input.applicableProducts !== undefined) data.applicableProducts = input.applicableProducts;
    if (input.isFirstOrderOnly !== undefined) data.isFirstOrderOnly = input.isFirstOrderOnly;

    const updated = await this.prisma.couponCode.update({
      where: { id: couponId },
      data,
    });

    return this.mapCouponToResponse(updated);
  }

  async deleteCoupon(tenantId: string, couponId: string): Promise<void> {
    const existing = await this.prisma.couponCode.findFirst({
      where: { id: couponId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Coupon not found');
    }

    await this.prisma.couponCode.delete({ where: { id: couponId } });
  }

  async listCoupons(
    tenantId: string,
    pagination: Pagination,
  ): Promise<PaginatedResult<CouponCodeResponse>> {
    const [items, total] = await Promise.all([
      this.prisma.couponCode.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.couponCode.count({ where: { tenantId } }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((c) => this.mapCouponToResponse(c)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private calculateDiscount(
    coupon: {
      discountType: string;
      discountValue: number;
      maxDiscountPaise: bigint | null;
    },
    cartTotalPaise: number,
  ): number {
    let discount: number;

    if (coupon.discountType === 'PERCENTAGE') {
      // discountValue is percentage (e.g. 10 = 10%)
      discount = Math.round((cartTotalPaise * coupon.discountValue) / 100);
    } else {
      // FIXED: discountValue is in paise
      discount = coupon.discountValue;
    }

    // Cap at maxDiscountPaise
    if (coupon.maxDiscountPaise) {
      discount = Math.min(discount, Number(coupon.maxDiscountPaise));
    }

    // Never exceed cart total
    discount = Math.min(discount, cartTotalPaise);

    return Math.max(0, discount);
  }

  private mapCouponToResponse(coupon: Record<string, unknown>): CouponCodeResponse {
    const c = coupon as Record<string, unknown>;
    return {
      id: c.id as string,
      code: c.code as string,
      description: (c.description as string) ?? null,
      discountType: c.discountType as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING',
      discountValue: c.discountValue as number,
      minOrderPaise: c.minOrderPaise ? Number(c.minOrderPaise) : null,
      maxDiscountPaise: c.maxDiscountPaise ? Number(c.maxDiscountPaise) : null,
      usageLimit: c.usageLimit as number,
      usedCount: c.usedCount as number,
      validFrom: new Date(c.validFrom as string),
      validTo: new Date(c.validTo as string),
      isActive: c.isActive as boolean,
      applicableCategories: c.applicableCategories ?? null,
      applicableProducts: c.applicableProducts ?? null,
      isFirstOrderOnly: c.isFirstOrderOnly as boolean,
      createdAt: new Date(c.createdAt as string),
      updatedAt: new Date(c.updatedAt as string),
    };
  }
}
