// ─── Customer Portal Loyalty Service ──────────────────────────
// Customer-facing loyalty dashboard, points history, tier benefits,
// and point redemption at checkout.

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { parsePagination, buildPaginatedResult } from '../../common/pagination.helper';
import type { PaginatedResult } from '@caratflow/shared-types';
import type {
  LoyaltyDashboardResponse,
  PointsHistoryItem,
  LoyaltyTierConfig,
} from '@caratflow/shared-types';
import type { PaginationQuery } from '../../common/pagination.helper';

@Injectable()
export class CustomerPortalLoyaltyService extends TenantAwareService {
  private readonly logger = new Logger(CustomerPortalLoyaltyService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Loyalty Dashboard ──────────────────────────────────────────

  async getLoyaltyDashboard(
    tenantId: string,
    customerId: string,
  ): Promise<LoyaltyDashboardResponse> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    const tiers = (program?.tiers as LoyaltyTierConfig[] | undefined) ?? [];
    const sortedTiers = [...tiers].sort((a, b) => a.minPoints - b.minPoints);

    // Find current and next tier
    const currentTier = sortedTiers.filter((t) => customer.loyaltyPoints >= t.minPoints).pop();
    const nextTier = sortedTiers.find((t) => t.minPoints > customer.loyaltyPoints);

    // Aggregate lifetime earned/redeemed and expiring soon
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [earnedAgg, redeemedAgg, expiringSoonAgg, nearestExpiry] = await Promise.all([
      this.prisma.loyaltyTransaction.aggregate({
        where: { tenantId, customerId, transactionType: { in: ['EARNED', 'BONUS'] } },
        _sum: { points: true },
      }),
      this.prisma.loyaltyTransaction.aggregate({
        where: { tenantId, customerId, transactionType: 'REDEEMED' },
        _sum: { points: true },
      }),
      this.prisma.loyaltyTransaction.aggregate({
        where: {
          tenantId,
          customerId,
          transactionType: 'EARNED',
          points: { gt: 0 },
          expiresAt: { gte: now, lte: thirtyDaysLater },
        },
        _sum: { points: true },
      }),
      this.prisma.loyaltyTransaction.findFirst({
        where: {
          tenantId,
          customerId,
          transactionType: 'EARNED',
          points: { gt: 0 },
          expiresAt: { gte: now },
        },
        orderBy: { expiresAt: 'asc' },
        select: { expiresAt: true },
      }),
    ]);

    return {
      currentPoints: customer.loyaltyPoints,
      tier: currentTier?.name ?? customer.loyaltyTier ?? null,
      tierBenefits: currentTier?.benefits ?? [],
      tierMultiplier: currentTier?.multiplier ?? null,
      lifetimeEarned: earnedAgg._sum.points ?? 0,
      lifetimeRedeemed: Math.abs(redeemedAgg._sum.points ?? 0),
      pointsExpiringSoon: expiringSoonAgg._sum.points ?? 0,
      pointsExpiryDate: nearestExpiry?.expiresAt ?? null,
      nextTier: nextTier?.name ?? null,
      pointsToNextTier: nextTier ? nextTier.minPoints - customer.loyaltyPoints : null,
      nextTierBenefits: nextTier?.benefits ?? [],
    };
  }

  // ─── Points History ─────────────────────────────────────────────

  async getPointsHistory(
    tenantId: string,
    customerId: string,
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<PointsHistoryItem>> {
    const { skip, take, page, limit } = parsePagination(pagination);

    const where = { tenantId, customerId };

    const [transactions, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.loyaltyTransaction.count({ where }),
    ]);

    const items: PointsHistoryItem[] = transactions.map((t) => ({
      id: t.id,
      transactionType: t.transactionType,
      points: t.points,
      balanceAfter: t.balanceAfter,
      description: t.description,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      expiresAt: t.expiresAt,
      createdAt: t.createdAt,
    }));

    return buildPaginatedResult(items, total, page, limit);
  }

  // ─── Tier Benefits ──────────────────────────────────────────────

  async getTierBenefits(
    tenantId: string,
    tier: string,
  ): Promise<{ tier: string; benefits: string[]; multiplier: number }> {
    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!program) throw new NotFoundException('No active loyalty program');

    const tiers = (program.tiers as LoyaltyTierConfig[]) ?? [];
    const found = tiers.find((t) => t.name.toLowerCase() === tier.toLowerCase());
    if (!found) throw new NotFoundException(`Tier "${tier}" not found`);

    return {
      tier: found.name,
      benefits: found.benefits,
      multiplier: found.multiplier,
    };
  }

  // ─── Redeem Points ──────────────────────────────────────────────

  async redeemPoints(
    tenantId: string,
    customerId: string,
    points: number,
    orderId: string,
  ): Promise<{ newBalance: number; redemptionValuePaise: number }> {
    if (points <= 0) throw new BadRequestException('Points must be positive');

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    if (customer.loyaltyPoints < points) {
      throw new BadRequestException(
        `Insufficient points. Available: ${customer.loyaltyPoints}, requested: ${points}`,
      );
    }

    // Verify the order belongs to this customer
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, tenantId, customerId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const program = await this.prisma.loyaltyProgram.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!program) throw new BadRequestException('No active loyalty program');

    const newBalance = customer.loyaltyPoints - points;
    // redemptionRate: e.g., 100 means 100 points = 1 currency unit (100 paise)
    const redemptionValuePaise = Math.floor((points / program.redemptionRate) * 100);

    await this.prisma.$transaction(async (tx) => {
      await tx.loyaltyTransaction.create({
        data: {
          tenantId,
          customerId,
          transactionType: 'REDEEMED',
          points: -points,
          balanceAfter: newBalance,
          referenceType: 'ORDER',
          referenceId: orderId,
          description: `Redeemed ${points} points on order ${order.orderNumber}`,
          createdBy: customerId,
          updatedBy: customerId,
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: newBalance, updatedBy: customerId },
      });
    });

    this.logger.log(
      `Customer ${customerId} redeemed ${points} points on order ${orderId} (value: ${redemptionValuePaise} paise)`,
    );

    return { newBalance, redemptionValuePaise };
  }
}
