// ─── Coupon Code Service ────────────────────────────────────────
// Admin CRUD, coupon validation, application, usage tracking,
// auto-apply discovery, and bulk code generation.

import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type {
  CouponCodeInput,
  CouponCodeUpdate,
  ValidateCouponInput,
  CouponValidationResult,
  BulkCouponGenerateInput,
} from '@caratflow/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

@Injectable()
export class CouponService extends TenantAwareService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── Admin CRUD ─────────────────────────────────────────────────

  async createCoupon(tenantId: string, userId: string, input: CouponCodeInput) {
    // Check uniqueness
    const existing = await this.prisma.couponCode.findUnique({
      where: { tenantId_code: { tenantId, code: input.code } },
    });
    if (existing) {
      throw new ConflictException(`Coupon code "${input.code}" already exists`);
    }

    if (input.validTo <= input.validFrom) {
      throw new BadRequestException('validTo must be after validFrom');
    }

    return this.prisma.couponCode.create({
      data: {
        tenantId,
        code: input.code,
        description: input.description,
        discountType: input.discountType,
        discountValue: input.discountValue,
        minOrderPaise: input.minOrderPaise ? BigInt(input.minOrderPaise) : null,
        maxDiscountPaise: input.maxDiscountPaise ? BigInt(input.maxDiscountPaise) : null,
        usageLimit: input.usageLimit,
        usageLimitPerCustomer: input.usageLimitPerCustomer,
        validFrom: input.validFrom,
        validTo: input.validTo,
        isActive: input.isActive,
        applicableCategories: input.applicableCategories ?? undefined,
        applicableProducts: input.applicableProducts ?? undefined,
        excludedProducts: input.excludedProducts ?? undefined,
        isFirstOrderOnly: input.isFirstOrderOnly,
        isAutoApply: input.isAutoApply,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async updateCoupon(tenantId: string, userId: string, couponId: string, input: CouponCodeUpdate) {
    await this.prisma.couponCode.findFirstOrThrow({
      where: { id: couponId, tenantId },
    });

    return this.prisma.couponCode.update({
      where: { id: couponId },
      data: {
        ...input,
        minOrderPaise: input.minOrderPaise !== undefined
          ? (input.minOrderPaise ? BigInt(input.minOrderPaise) : null)
          : undefined,
        maxDiscountPaise: input.maxDiscountPaise !== undefined
          ? (input.maxDiscountPaise ? BigInt(input.maxDiscountPaise) : null)
          : undefined,
        updatedBy: userId,
      },
    });
  }

  async deactivateCoupon(tenantId: string, userId: string, couponId: string) {
    await this.prisma.couponCode.findFirstOrThrow({
      where: { id: couponId, tenantId },
    });

    return this.prisma.couponCode.update({
      where: { id: couponId },
      data: { isActive: false, updatedBy: userId },
    });
  }

  async listCoupons(
    tenantId: string,
    page = 1,
    limit = 20,
    isActive?: boolean,
  ) {
    const where: Record<string, unknown> = { tenantId };
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      this.prisma.couponCode.findMany({
        where: where as Parameters<typeof this.prisma.couponCode.findMany>[0]['where'],
        include: {
          _count: { select: { usages: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.couponCode.count({
        where: where as Parameters<typeof this.prisma.couponCode.count>[0]['where'],
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items: items.map((c) => ({
        ...c,
        usageCount: c._count.usages,
      })),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async getCoupon(tenantId: string, couponId: string) {
    return this.prisma.couponCode.findFirstOrThrow({
      where: { id: couponId, tenantId },
      include: {
        _count: { select: { usages: true } },
      },
    });
  }

  // ─── Validation & Application ──────────────────────────────────

  async validateCoupon(
    tenantId: string,
    customerId: string,
    input: ValidateCouponInput,
  ): Promise<CouponValidationResult> {
    const coupon = await this.prisma.couponCode.findUnique({
      where: { tenantId_code: { tenantId, code: input.code } },
    });

    if (!coupon) {
      return { valid: false, discountPaise: 0, errorMessage: 'Invalid coupon code' };
    }

    // Check active
    if (!coupon.isActive) {
      return { valid: false, discountPaise: 0, errorMessage: 'Coupon is no longer active' };
    }

    // Check date range
    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validTo) {
      return { valid: false, discountPaise: 0, errorMessage: 'Coupon has expired or is not yet valid' };
    }

    // Check global usage limit
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, discountPaise: 0, errorMessage: 'Coupon usage limit has been reached' };
    }

    // Check per-customer usage limit
    const customerUsageCount = await this.prisma.couponUsage.count({
      where: { couponId: coupon.id, customerId, tenantId },
    });
    if (customerUsageCount >= coupon.usageLimitPerCustomer) {
      return { valid: false, discountPaise: 0, errorMessage: 'You have already used this coupon the maximum number of times' };
    }

    // Check minimum order
    if (coupon.minOrderPaise !== null && BigInt(input.cartTotalPaise) < coupon.minOrderPaise) {
      const minOrderFormatted = Number(coupon.minOrderPaise) / 100;
      return {
        valid: false,
        discountPaise: 0,
        errorMessage: `Minimum order amount is ${minOrderFormatted}. Please add more items.`,
      };
    }

    // Check first-order-only
    if (coupon.isFirstOrderOnly) {
      const previousOrders = await this.prisma.couponUsage.count({
        where: { customerId, tenantId },
      });
      if (previousOrders > 0) {
        return { valid: false, discountPaise: 0, errorMessage: 'This coupon is valid for first orders only' };
      }
    }

    // Check product/category applicability
    const applicableProducts = coupon.applicableProducts as string[] | null;
    const applicableCategories = coupon.applicableCategories as string[] | null;
    const excludedProducts = coupon.excludedProducts as string[] | null;

    let eligibleItems = input.cartItems;

    if (excludedProducts && excludedProducts.length > 0) {
      eligibleItems = eligibleItems.filter(
        (item) => !excludedProducts.includes(item.productId),
      );
    }

    if (applicableProducts && applicableProducts.length > 0) {
      eligibleItems = eligibleItems.filter(
        (item) => applicableProducts.includes(item.productId),
      );
    }

    if (applicableCategories && applicableCategories.length > 0) {
      eligibleItems = eligibleItems.filter(
        (item) => item.categoryId && applicableCategories.includes(item.categoryId),
      );
    }

    if (eligibleItems.length === 0) {
      return { valid: false, discountPaise: 0, errorMessage: 'Coupon is not applicable to any items in your cart' };
    }

    // Calculate discount
    const discountPaise = this.calculateDiscount(coupon, eligibleItems, input.cartTotalPaise);

    return {
      valid: true,
      discountPaise,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description,
      },
    };
  }

  async applyCoupon(
    tenantId: string,
    code: string,
    cartTotalPaise: number,
    cartItems: Array<{ productId: string; categoryId?: string; pricePaise: number; quantity: number }>,
  ): Promise<number> {
    const coupon = await this.prisma.couponCode.findUniqueOrThrow({
      where: { tenantId_code: { tenantId, code } },
    });

    const applicableProducts = coupon.applicableProducts as string[] | null;
    const applicableCategories = coupon.applicableCategories as string[] | null;
    const excludedProducts = coupon.excludedProducts as string[] | null;

    let eligibleItems = cartItems;

    if (excludedProducts && excludedProducts.length > 0) {
      eligibleItems = eligibleItems.filter(
        (item) => !excludedProducts.includes(item.productId),
      );
    }

    if (applicableProducts && applicableProducts.length > 0) {
      eligibleItems = eligibleItems.filter(
        (item) => applicableProducts.includes(item.productId),
      );
    }

    if (applicableCategories && applicableCategories.length > 0) {
      eligibleItems = eligibleItems.filter(
        (item) => item.categoryId && applicableCategories.includes(item.categoryId),
      );
    }

    return this.calculateDiscount(coupon, eligibleItems, cartTotalPaise);
  }

  async recordUsage(
    tenantId: string,
    couponId: string,
    customerId: string,
    orderId: string,
    discountAppliedPaise: number,
  ) {
    const coupon = await this.prisma.couponCode.findFirstOrThrow({
      where: { id: couponId, tenantId },
    });

    const [usage] = await this.prisma.$transaction([
      this.prisma.couponUsage.create({
        data: {
          tenantId,
          couponId,
          customerId,
          orderId,
          discountAppliedPaise: BigInt(discountAppliedPaise),
        },
      }),
      this.prisma.couponCode.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    // Publish event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'b2c.coupon.used',
      payload: {
        couponId,
        couponCode: coupon.code,
        customerId,
        orderId,
        discountPaise: discountAppliedPaise,
      },
    });

    return usage;
  }

  async getAutoApplyCoupons(
    tenantId: string,
    customerId: string,
    cartTotalPaise: number,
    cartItems: Array<{ productId: string; categoryId?: string; pricePaise: number; quantity: number }>,
  ) {
    const now = new Date();
    const autoApplyCoupons = await this.prisma.couponCode.findMany({
      where: {
        tenantId,
        isActive: true,
        isAutoApply: true,
        validFrom: { lte: now },
        validTo: { gte: now },
      },
    });

    let bestCoupon: { coupon: typeof autoApplyCoupons[0]; discountPaise: number } | null = null;

    for (const coupon of autoApplyCoupons) {
      // Check usage limits
      if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) continue;

      const customerUsageCount = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id, customerId, tenantId },
      });
      if (customerUsageCount >= coupon.usageLimitPerCustomer) continue;

      // Check min order
      if (coupon.minOrderPaise !== null && BigInt(cartTotalPaise) < coupon.minOrderPaise) continue;

      // Check first-order-only
      if (coupon.isFirstOrderOnly) {
        const previousOrders = await this.prisma.couponUsage.count({
          where: { customerId, tenantId },
        });
        if (previousOrders > 0) continue;
      }

      // Calculate eligible items
      const applicableProducts = coupon.applicableProducts as string[] | null;
      const applicableCategories = coupon.applicableCategories as string[] | null;
      const excludedProducts = coupon.excludedProducts as string[] | null;

      let eligibleItems = cartItems;

      if (excludedProducts && excludedProducts.length > 0) {
        eligibleItems = eligibleItems.filter((item) => !excludedProducts.includes(item.productId));
      }
      if (applicableProducts && applicableProducts.length > 0) {
        eligibleItems = eligibleItems.filter((item) => applicableProducts.includes(item.productId));
      }
      if (applicableCategories && applicableCategories.length > 0) {
        eligibleItems = eligibleItems.filter(
          (item) => item.categoryId && applicableCategories.includes(item.categoryId),
        );
      }

      if (eligibleItems.length === 0) continue;

      const discount = this.calculateDiscount(coupon, eligibleItems, cartTotalPaise);

      if (!bestCoupon || discount > bestCoupon.discountPaise) {
        bestCoupon = { coupon, discountPaise: discount };
      }
    }

    return bestCoupon
      ? {
          couponId: bestCoupon.coupon.id,
          code: bestCoupon.coupon.code,
          discountType: bestCoupon.coupon.discountType,
          discountValue: bestCoupon.coupon.discountValue,
          description: bestCoupon.coupon.description,
          discountPaise: bestCoupon.discountPaise,
        }
      : null;
  }

  async generateBulkCoupons(
    tenantId: string,
    userId: string,
    input: BulkCouponGenerateInput,
  ): Promise<{ generatedCount: number; codes: string[] }> {
    const codes: string[] = [];
    const batchData: Array<{
      tenantId: string;
      code: string;
      discountType: typeof input.discountType;
      discountValue: number;
      minOrderPaise: bigint | null;
      maxDiscountPaise: bigint | null;
      usageLimitPerCustomer: number;
      usageLimit: number;
      validFrom: Date;
      validTo: Date;
      isFirstOrderOnly: boolean;
      isActive: boolean;
      createdBy: string;
      updatedBy: string;
    }> = [];

    for (let i = 0; i < input.count; i++) {
      const suffix = randomBytes(4).toString('hex').toUpperCase();
      const code = `${input.prefix}-${suffix}`;
      codes.push(code);

      batchData.push({
        tenantId,
        code,
        discountType: input.discountType,
        discountValue: input.discountValue,
        minOrderPaise: input.minOrderPaise ? BigInt(input.minOrderPaise) : null,
        maxDiscountPaise: input.maxDiscountPaise ? BigInt(input.maxDiscountPaise) : null,
        usageLimitPerCustomer: input.usageLimitPerCustomer,
        usageLimit: 1, // Each bulk code is single-use
        validFrom: input.validFrom,
        validTo: input.validTo,
        isFirstOrderOnly: input.isFirstOrderOnly,
        isActive: true,
        createdBy: userId,
        updatedBy: userId,
      });
    }

    // Use createMany for batch insert
    await this.prisma.couponCode.createMany({
      data: batchData,
      skipDuplicates: true,
    });

    this.logger.log(`Generated ${codes.length} bulk coupons with prefix ${input.prefix}`);
    return { generatedCount: codes.length, codes };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private calculateDiscount(
    coupon: {
      discountType: string;
      discountValue: number;
      maxDiscountPaise: bigint | null;
    },
    eligibleItems: Array<{ pricePaise: number; quantity: number }>,
    cartTotalPaise: number,
  ): number {
    const eligibleTotal = eligibleItems.reduce(
      (sum, item) => sum + item.pricePaise * item.quantity,
      0,
    );

    let discount = 0;

    switch (coupon.discountType) {
      case 'PERCENTAGE': {
        // discountValue is percent * 100 (e.g., 1000 = 10%)
        discount = Math.floor((eligibleTotal * coupon.discountValue) / 10000);
        break;
      }
      case 'FIXED_AMOUNT': {
        // discountValue is in paise
        discount = Math.min(coupon.discountValue, eligibleTotal);
        break;
      }
      case 'FREE_SHIPPING': {
        // Free shipping -- discount is 0, but shipping charges would be waived
        // Return 0 as the monetary discount; shipping is handled by the checkout
        discount = 0;
        break;
      }
      default:
        discount = 0;
    }

    // Apply max discount cap
    if (coupon.maxDiscountPaise !== null) {
      discount = Math.min(discount, Number(coupon.maxDiscountPaise));
    }

    // Discount cannot exceed cart total
    discount = Math.min(discount, cartTotalPaise);

    return discount;
  }
}
