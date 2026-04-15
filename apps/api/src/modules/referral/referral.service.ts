// ─── Referral Service ──────────────────────────────────────────
// Core referral rewards engine: program config, code generation,
// referral tracking, reward calculation and issuance.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@caratflow/db';
import { EventBusService } from '../../event-bus/event-bus.service';
import type { ReferralProgramInput } from '@caratflow/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReferralService extends TenantAwareService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── Program CRUD ──────────────────────────────────────────────

  async createProgram(tenantId: string, userId: string, input: ReferralProgramInput) {
    return this.prisma.referralProgram.create({
      data: {
        tenantId,
        name: input.name,
        referrerRewardType: input.referrerRewardType,
        referrerRewardValue: input.referrerRewardValue,
        refereeRewardType: input.refereeRewardType,
        refereeRewardValue: input.refereeRewardValue,
        minOrderForRewardPaise: input.minOrderForRewardPaise
          ? BigInt(input.minOrderForRewardPaise)
          : null,
        maxReferralsPerCustomer: input.maxReferralsPerCustomer ?? null,
        isActive: input.isActive,
        validFrom: input.validFrom,
        validTo: input.validTo ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async updateProgram(tenantId: string, userId: string, programId: string, input: Partial<ReferralProgramInput>) {
    await this.prisma.referralProgram.findFirstOrThrow({
      where: { id: programId, tenantId },
    });
    return this.prisma.referralProgram.update({
      where: { id: programId },
      data: {
        ...input,
        minOrderForRewardPaise: input.minOrderForRewardPaise !== undefined
          ? (input.minOrderForRewardPaise ? BigInt(input.minOrderForRewardPaise) : null)
          : undefined,
        updatedBy: userId,
      },
    });
  }

  async getActiveProgram(tenantId: string) {
    const now = new Date();
    return this.prisma.referralProgram.findFirst({
      where: {
        tenantId,
        isActive: true,
        validFrom: { lte: now },
        OR: [
          { validTo: null },
          { validTo: { gte: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPrograms(tenantId: string) {
    return this.prisma.referralProgram.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProgram(tenantId: string, programId: string) {
    return this.prisma.referralProgram.findFirstOrThrow({
      where: { id: programId, tenantId },
    });
  }

  // ─── Referral Code ─────────────────────────────────────────────

  /** Generate a unique referral code for a customer */
  async generateReferralCode(tenantId: string, customerId: string): Promise<{ code: string; id: string }> {
    const program = await this.getActiveProgram(tenantId);
    if (!program) throw new Error('No active referral program');

    // Check if customer already has an active code for this program
    const existing = await this.prisma.referralCode.findFirst({
      where: { tenantId, customerId, programId: program.id, isActive: true },
    });
    if (existing) {
      return { code: existing.code, id: existing.id };
    }

    // Generate unique code: CF-{first4OfId}-{random4}
    const code = await this.generateUniqueCode(customerId);

    const referralCode = await this.prisma.referralCode.create({
      data: {
        tenantId,
        customerId,
        programId: program.id,
        code,
        isActive: true,
      },
    });

    return { code: referralCode.code, id: referralCode.id };
  }

  /** Get a customer's referral code */
  async getReferralCode(tenantId: string, customerId: string) {
    const code = await this.prisma.referralCode.findFirst({
      where: { tenantId, customerId, isActive: true },
      include: { program: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!code) {
      // Auto-generate if none exists
      return this.generateReferralCode(tenantId, customerId);
    }

    return { code: code.code, id: code.id, program: code.program };
  }

  // ─── Apply Referral ────────────────────────────────────────────

  /** Apply a referral code when a new customer registers or enters a code */
  async applyReferral(
    tenantId: string,
    refereeId: string,
    code: string,
    invitedVia: 'WHATSAPP' | 'EMAIL' | 'SMS' | 'LINK' | 'SOCIAL' = 'LINK',
  ) {
    // Find the referral code
    const referralCode = await this.prisma.referralCode.findFirst({
      where: { code, isActive: true },
      include: { program: true },
    });

    if (!referralCode) throw new Error('Invalid or inactive referral code');
    if (referralCode.tenantId !== tenantId) throw new Error('Referral code not valid for this store');

    // Validate program is still active
    const now = new Date();
    if (!referralCode.program.isActive) throw new Error('Referral program is no longer active');
    if (referralCode.program.validTo && referralCode.program.validTo < now) {
      throw new Error('Referral program has expired');
    }

    // Cannot refer yourself
    if (referralCode.customerId === refereeId) {
      throw new Error('Cannot use your own referral code');
    }

    // Check if referee already has a referral from this referrer
    const existingReferral = await this.prisma.referral.findFirst({
      where: {
        tenantId,
        refereeId,
        referrerId: referralCode.customerId,
      },
    });
    if (existingReferral) throw new Error('You have already been referred by this customer');

    // Check max referrals limit
    if (referralCode.program.maxReferralsPerCustomer) {
      const referralCount = await this.prisma.referral.count({
        where: {
          tenantId,
          referrerId: referralCode.customerId,
          status: { in: ['REGISTERED', 'FIRST_ORDER', 'REWARDED'] },
        },
      });
      if (referralCount >= referralCode.program.maxReferralsPerCustomer) {
        throw new Error('Referrer has reached maximum referral limit');
      }
    }

    // Create referral record
    const referral = await this.prisma.referral.create({
      data: {
        tenantId,
        referralCodeId: referralCode.id,
        referrerId: referralCode.customerId,
        refereeId,
        status: 'REGISTERED',
        invitedVia: invitedVia,
      },
    });

    // Update usage count
    await this.prisma.referralCode.update({
      where: { id: referralCode.id },
      data: { usageCount: { increment: 1 } },
    });

    this.logger.log(`Referral applied: ${refereeId} referred by ${referralCode.customerId} via code ${code}`);

    return referral;
  }

  // ─── Complete Referral ──────────────────────────────────────────

  /** Complete referral when referee places their first qualifying order */
  async completeReferral(
    tenantId: string,
    referralId: string,
    orderId: string,
    orderAmountPaise: bigint,
  ) {
    const referral = await this.prisma.referral.findFirstOrThrow({
      where: { id: referralId, tenantId },
      include: {
        referralCode: { include: { program: true } },
      },
    });

    if (referral.status === 'REWARDED') {
      throw new Error('Referral has already been rewarded');
    }
    if (referral.status === 'EXPIRED') {
      throw new Error('Referral has expired');
    }

    const program = referral.referralCode.program;

    // Check minimum order amount
    if (program.minOrderForRewardPaise && orderAmountPaise < program.minOrderForRewardPaise) {
      // Update status to FIRST_ORDER but don't reward yet
      await this.prisma.referral.update({
        where: { id: referralId },
        data: { status: 'FIRST_ORDER', refereeOrderId: orderId },
      });
      return { rewarded: false, reason: 'Order amount below minimum threshold' };
    }

    // Calculate rewards
    const referrerRewardPaise = BigInt(this.calculateRewardPaise(
      program.referrerRewardType,
      program.referrerRewardValue,
      orderAmountPaise,
    ));
    const refereeRewardPaise = BigInt(this.calculateRewardPaise(
      program.refereeRewardType,
      program.refereeRewardValue,
      orderAmountPaise,
    ));

    const now = new Date();

    // Execute in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update referral status
      await tx.referral.update({
        where: { id: referralId },
        data: {
          status: 'REWARDED',
          refereeOrderId: orderId,
          referrerRewardPaise,
          refereeRewardPaise,
          rewardedAt: now,
        },
      });

      // Create payout for referrer
      await tx.referralPayout.create({
        data: {
          tenantId,
          referralId,
          customerId: referral.referrerId,
          payoutType: this.mapRewardTypeToPayoutType(program.referrerRewardType),
          amount: program.referrerRewardValue,
          status: 'PENDING',
        },
      });

      // Create payout for referee
      await tx.referralPayout.create({
        data: {
          tenantId,
          referralId,
          customerId: referral.refereeId,
          payoutType: this.mapRewardTypeToPayoutType(program.refereeRewardType),
          amount: program.refereeRewardValue,
          status: 'PENDING',
        },
      });

      // Update referral code total rewards
      await tx.referralCode.update({
        where: { id: referral.referralCodeId },
        data: {
          totalRewardsEarnedPaise: {
            increment: referrerRewardPaise,
          },
        },
      });
    });

    // Emit event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId: 'SYSTEM',
      timestamp: now.toISOString(),
      type: 'crm.referral.completed',
      payload: {
        referralId,
        referrerId: referral.referrerId,
        refereeId: referral.refereeId,
        referrerRewardPaise: Number(referrerRewardPaise),
        refereeRewardPaise: Number(refereeRewardPaise),
        orderId,
      },
    });

    this.logger.log(`Referral ${referralId} completed. Referrer: ${referral.referrerId}, Referee: ${referral.refereeId}`);

    return {
      rewarded: true,
      referrerRewardPaise: Number(referrerRewardPaise),
      refereeRewardPaise: Number(refereeRewardPaise),
    };
  }

  // ─── Stats ──────────────────────────────────────────────────────

  /** Get referral stats for a customer */
  async getReferralStats(tenantId: string, customerId: string) {
    const referralCode = await this.prisma.referralCode.findFirst({
      where: { tenantId, customerId, isActive: true },
    });

    if (!referralCode) {
      return {
        customerId,
        referralCode: '',
        totalReferrals: 0,
        successfulReferrals: 0,
        pendingReferrals: 0,
        totalRewardsEarnedPaise: 0,
        conversionRate: 0,
      };
    }

    const [total, successful, pending] = await Promise.all([
      this.prisma.referral.count({
        where: { tenantId, referrerId: customerId },
      }),
      this.prisma.referral.count({
        where: { tenantId, referrerId: customerId, status: 'REWARDED' },
      }),
      this.prisma.referral.count({
        where: { tenantId, referrerId: customerId, status: { in: ['INVITED', 'REGISTERED', 'FIRST_ORDER'] } },
      }),
    ]);

    return {
      customerId,
      referralCode: referralCode.code,
      totalReferrals: total,
      successfulReferrals: successful,
      pendingReferrals: pending,
      totalRewardsEarnedPaise: Number(referralCode.totalRewardsEarnedPaise),
      conversionRate: total > 0 ? Math.round((successful / total) * 100) / 100 : 0,
    };
  }

  /** Get referral leaderboard */
  async getLeaderboard(tenantId: string, limit = 20) {
    const results = await this.prisma.referralCode.findMany({
      where: { tenantId, isActive: true },
      orderBy: { usageCount: 'desc' },
      take: limit,
    });

    // Fetch customer names
    const customerIds = results.map((r) => r.customerId);
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds }, tenantId },
      select: { id: true, firstName: true, lastName: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

    return results.map((r, index) => ({
      customerId: r.customerId,
      customerName: customerMap.get(r.customerId) ?? 'Unknown',
      referralCount: r.usageCount,
      totalRewardsPaise: Number(r.totalRewardsEarnedPaise),
      rank: index + 1,
    }));
  }

  /** List referrals (admin) */
  async listReferrals(tenantId: string, page = 1, limit = 20, status?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.referral.findMany({
        where: where as Prisma.ReferralWhereInput,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          referralCode: { select: { code: true, customerId: true } },
        },
      }),
      this.prisma.referral.count({
        where: where as Prisma.ReferralWhereInput,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  /** List payouts (admin) */
  async listPayouts(tenantId: string, page = 1, limit = 20, status?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.referralPayout.findMany({
        where: where as Prisma.ReferralPayoutWhereInput,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.referralPayout.count({
        where: where as Prisma.ReferralPayoutWhereInput,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  /** Credit a payout */
  async creditPayout(tenantId: string, userId: string, payoutId: string) {
    const payout = await this.prisma.referralPayout.findFirstOrThrow({
      where: { id: payoutId, tenantId },
    });

    if (payout.status !== 'PENDING') {
      throw new Error(`Payout is already ${payout.status}`);
    }

    return this.prisma.referralPayout.update({
      where: { id: payoutId },
      data: {
        status: 'CREDITED',
        creditedAt: new Date(),
        couponCodeGenerated: payout.payoutType === 'COUPON_CODE'
          ? `REF-${uuidv4().slice(0, 8).toUpperCase()}`
          : null,
      },
    });
  }

  // ─── Conversion Funnel ──────────────────────────────────────────

  async getConversionFunnel(tenantId: string) {
    const [invited, registered, firstOrder, rewarded, expired] = await Promise.all([
      this.prisma.referral.count({ where: { tenantId, status: 'INVITED' } }),
      this.prisma.referral.count({ where: { tenantId, status: 'REGISTERED' } }),
      this.prisma.referral.count({ where: { tenantId, status: 'FIRST_ORDER' } }),
      this.prisma.referral.count({ where: { tenantId, status: 'REWARDED' } }),
      this.prisma.referral.count({ where: { tenantId, status: 'EXPIRED' } }),
    ]);

    return { invited, registered, firstOrder, rewarded, expired };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private calculateRewardPaise(
    rewardType: string,
    rewardValue: number,
    orderAmountPaise: bigint,
  ): number {
    switch (rewardType) {
      case 'POINTS':
        // Points value: rewardValue is number of points, each point = 1 paise for tracking
        return rewardValue;
      case 'DISCOUNT_COUPON':
        // Coupon value: rewardValue is the coupon value in smallest currency unit
        return rewardValue;
      case 'CASHBACK':
        // Cashback: rewardValue is percentage * 100 (e.g., 500 = 5%)
        return Math.floor(Number(orderAmountPaise) * rewardValue / 10000);
      default:
        return 0;
    }
  }

  private mapRewardTypeToPayoutType(rewardType: string): 'LOYALTY_POINTS' | 'COUPON_CODE' | 'CASHBACK' {
    switch (rewardType) {
      case 'POINTS': return 'LOYALTY_POINTS';
      case 'DISCOUNT_COUPON': return 'COUPON_CODE';
      case 'CASHBACK': return 'CASHBACK';
      default: return 'LOYALTY_POINTS';
    }
  }

  private async generateUniqueCode(customerId: string): Promise<string> {
    const prefix = customerId.slice(0, 4).toUpperCase();
    let attempts = 0;
    while (attempts < 10) {
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `CF-${prefix}-${random}`;
      const existing = await this.prisma.referralCode.findUnique({ where: { code } });
      if (!existing) return code;
      attempts++;
    }
    // Fallback to UUID-based
    return `CF-${uuidv4().slice(0, 8).toUpperCase()}`;
  }
}
