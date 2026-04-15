// ─── CRM Loyalty Service ───────────────────────────────────────
// Loyalty engine: configure program, earn/redeem/expire points, tier calc.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { Prisma } from '@caratflow/db';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type {
  LoyaltyProgramInput,
  LoyaltyTransactionInput,
  LoyaltyBalanceResponse,
  LoyaltyTierConfig,
} from '@caratflow/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CrmLoyaltyService extends TenantAwareService {
  private readonly logger = new Logger(CrmLoyaltyService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── Program Configuration ─────────────────────────────────────

  async createProgram(tenantId: string, userId: string, input: LoyaltyProgramInput) {
    return this.prisma.loyaltyProgram.create({
      data: {
        tenantId,
        name: input.name,
        pointsPerCurrencyUnit: input.pointsPerCurrencyUnit,
        redemptionRate: input.redemptionRate,
        tiers: input.tiers as unknown as Prisma.InputJsonValue,
        isActive: input.isActive,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async updateProgram(tenantId: string, userId: string, programId: string, input: Partial<LoyaltyProgramInput>) {
    await this.prisma.loyaltyProgram.findFirstOrThrow({
      where: { id: programId, tenantId },
    });
    return this.prisma.loyaltyProgram.update({
      where: { id: programId },
      data: {
        ...input,
        tiers: input.tiers ? (input.tiers as unknown as Prisma.InputJsonValue) : undefined,
        updatedBy: userId,
      },
    });
  }

  async getActiveProgram(tenantId: string) {
    return this.prisma.loyaltyProgram.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listPrograms(tenantId: string) {
    return this.prisma.loyaltyProgram.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Points Operations ─────────────────────────────────────────

  /** Earn points -- triggered by sale events or manual bonus */
  async earnPoints(
    tenantId: string,
    userId: string,
    customerId: string,
    points: number,
    referenceType: string,
    referenceId: string,
    description?: string,
  ): Promise<{ transaction: unknown; newBalance: number }> {
    if (points <= 0) throw new Error('Points to earn must be positive');

    const customer = await this.prisma.customer.findFirstOrThrow({
      where: { id: customerId, tenantId },
    });

    const newBalance = customer.loyaltyPoints + points;

    // Calculate expiry (12 months from now by default)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const transaction = await this.prisma.$transaction(async (tx) => {
      // Create transaction
      const txn = await tx.loyaltyTransaction.create({
        data: {
          tenantId,
          customerId,
          transactionType: 'EARNED',
          points,
          balanceAfter: newBalance,
          referenceType,
          referenceId,
          description: description ?? `Earned ${points} points`,
          expiresAt,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // Update customer balance
      await tx.customer.update({
        where: { id: customerId },
        data: {
          loyaltyPoints: newBalance,
          updatedBy: userId,
        },
      });

      return txn;
    });

    // Recalculate tier
    await this.recalculateTier(tenantId, userId, customerId, newBalance);

    // Emit event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'crm.loyalty.points_earned',
      payload: { customerId, points, source: referenceType, referenceId },
    });

    return { transaction, newBalance };
  }

  /** Redeem points at POS */
  async redeemPoints(
    tenantId: string,
    userId: string,
    customerId: string,
    points: number,
    referenceType: string,
    referenceId: string,
  ): Promise<{ transaction: unknown; newBalance: number; redemptionValuePaise: number }> {
    if (points <= 0) throw new Error('Points to redeem must be positive');

    const customer = await this.prisma.customer.findFirstOrThrow({
      where: { id: customerId, tenantId },
    });

    if (customer.loyaltyPoints < points) {
      throw new Error(`Insufficient points. Available: ${customer.loyaltyPoints}, requested: ${points}`);
    }

    const program = await this.getActiveProgram(tenantId);
    if (!program) throw new Error('No active loyalty program configured');

    const newBalance = customer.loyaltyPoints - points;
    // e.g., redemptionRate = 100 means 100 points = 1 currency unit (100 paise)
    const redemptionValuePaise = Math.floor((points / program.redemptionRate) * 100);

    const transaction = await this.prisma.$transaction(async (tx) => {
      const txn = await tx.loyaltyTransaction.create({
        data: {
          tenantId,
          customerId,
          transactionType: 'REDEEMED',
          points: -points,
          balanceAfter: newBalance,
          referenceType,
          referenceId,
          description: `Redeemed ${points} points`,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: {
          loyaltyPoints: newBalance,
          updatedBy: userId,
        },
      });

      return txn;
    });

    await this.recalculateTier(tenantId, userId, customerId, newBalance);

    return { transaction, newBalance, redemptionValuePaise };
  }

  /** Manual adjustment (admin correction) */
  async adjustPoints(tenantId: string, userId: string, input: LoyaltyTransactionInput) {
    const customer = await this.prisma.customer.findFirstOrThrow({
      where: { id: input.customerId, tenantId },
    });

    const newBalance = customer.loyaltyPoints + input.points;
    if (newBalance < 0) throw new Error('Adjustment would result in negative balance');

    return this.prisma.$transaction(async (tx) => {
      const txn = await tx.loyaltyTransaction.create({
        data: {
          tenantId,
          customerId: input.customerId,
          transactionType: input.transactionType,
          points: input.points,
          balanceAfter: newBalance,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          description: input.description,
          expiresAt: input.expiresAt,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.customer.update({
        where: { id: input.customerId },
        data: { loyaltyPoints: newBalance, updatedBy: userId },
      });

      return txn;
    });
  }

  /** Expire points -- called by BullMQ cron job */
  async expirePoints(tenantId: string): Promise<number> {
    const now = new Date();
    // Find unexpired EARNED transactions whose expiresAt has passed
    const expiring = await this.prisma.loyaltyTransaction.findMany({
      where: {
        tenantId,
        transactionType: 'EARNED',
        expiresAt: { lte: now },
        points: { gt: 0 },
      },
    });

    let totalExpired = 0;

    for (const txn of expiring) {
      try {
        const customer = await this.prisma.customer.findFirst({
          where: { id: txn.customerId, tenantId },
        });
        if (!customer) continue;

        const pointsToExpire = Math.min(txn.points, customer.loyaltyPoints);
        if (pointsToExpire <= 0) continue;

        const newBalance = customer.loyaltyPoints - pointsToExpire;

        await this.prisma.$transaction(async (tx) => {
          // Mark original as zero (consumed)
          await tx.loyaltyTransaction.update({
            where: { id: txn.id },
            data: { points: 0 },
          });

          // Create expiry transaction
          await tx.loyaltyTransaction.create({
            data: {
              tenantId,
              customerId: txn.customerId,
              transactionType: 'EXPIRED',
              points: -pointsToExpire,
              balanceAfter: newBalance,
              referenceType: 'EXPIRY',
              referenceId: txn.id,
              description: `Expired ${pointsToExpire} points`,
              createdBy: 'SYSTEM',
              updatedBy: 'SYSTEM',
            },
          });

          await tx.customer.update({
            where: { id: txn.customerId },
            data: { loyaltyPoints: newBalance },
          });
        });

        totalExpired += pointsToExpire;
      } catch (err) {
        this.logger.error(`Failed to expire points for txn ${txn.id}: ${err}`);
      }
    }

    this.logger.log(`Expired ${totalExpired} points for tenant ${tenantId}`);
    return totalExpired;
  }

  /** Get loyalty balance and tier info for a customer */
  async getBalance(tenantId: string, customerId: string): Promise<LoyaltyBalanceResponse> {
    const customer = await this.prisma.customer.findFirstOrThrow({
      where: { id: customerId, tenantId },
    });

    const program = await this.getActiveProgram(tenantId);
    const tiers = (program?.tiers as LoyaltyTierConfig[] | undefined) ?? [];

    // Aggregate lifetime earned/redeemed
    const [earnedAgg, redeemedAgg, expiringSoon] = await Promise.all([
      this.prisma.loyaltyTransaction.aggregate({
        where: { tenantId, customerId, transactionType: { in: ['EARNED', 'BONUS'] } },
        _sum: { points: true },
      }),
      this.prisma.loyaltyTransaction.aggregate({
        where: { tenantId, customerId, transactionType: 'REDEEMED' },
        _sum: { points: true },
      }),
      // Points expiring in next 30 days
      this.prisma.loyaltyTransaction.aggregate({
        where: {
          tenantId,
          customerId,
          transactionType: 'EARNED',
          points: { gt: 0 },
          expiresAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        _sum: { points: true },
      }),
    ]);

    // Find current and next tier
    const sortedTiers = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
    const currentTier = sortedTiers.filter((t) => customer.loyaltyPoints >= t.minPoints).pop();
    const nextTier = sortedTiers.find((t) => t.minPoints > customer.loyaltyPoints);

    return {
      customerId,
      currentPoints: customer.loyaltyPoints,
      tier: currentTier?.name ?? customer.loyaltyTier ?? undefined,
      tierMultiplier: currentTier?.multiplier,
      lifetimeEarned: earnedAgg._sum.points ?? 0,
      lifetimeRedeemed: Math.abs(redeemedAgg._sum.points ?? 0),
      pointsExpiringSoon: expiringSoon._sum.points ?? 0,
      nextTier: nextTier?.name,
      pointsToNextTier: nextTier ? nextTier.minPoints - customer.loyaltyPoints : undefined,
    };
  }

  /** Get transaction history for a customer */
  async getTransactionHistory(tenantId: string, customerId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where: { tenantId, customerId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.loyaltyTransaction.count({
        where: { tenantId, customerId },
      }),
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

  /** Recalculate customer tier based on current points */
  private async recalculateTier(tenantId: string, userId: string, customerId: string, currentPoints: number) {
    const program = await this.getActiveProgram(tenantId);
    if (!program) return;

    const tiers = (program.tiers as LoyaltyTierConfig[]) ?? [];
    const sortedTiers = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
    const newTier = sortedTiers.filter((t) => currentPoints >= t.minPoints).pop();

    if (newTier) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyTier: newTier.name, updatedBy: userId },
      });
    }
  }

  /** Calculate points to earn for a sale amount (in paise) */
  async calculatePointsForSale(tenantId: string, amountPaise: number): Promise<number> {
    const program = await this.getActiveProgram(tenantId);
    if (!program) return 0;

    // pointsPerCurrencyUnit: e.g., 1 point per 100 INR -> amountPaise / (100 * 100) * 1
    // If pointsPerCurrencyUnit = 1, and the "unit" is 100 INR (10000 paise)
    // Points = floor(amountPaise / 10000) * pointsPerCurrencyUnit
    // For simplicity: 1 point per X paise = pointsPerCurrencyUnit points per 100 currency units
    const points = Math.floor(amountPaise / 10000) * program.pointsPerCurrencyUnit;
    return Math.max(0, points);
  }
}
