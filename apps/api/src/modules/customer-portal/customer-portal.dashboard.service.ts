// ─── Customer Portal Dashboard Service ────────────────────────
// Aggregated "My Account" dashboard: recent orders, loyalty
// summary, schemes, wishlist count, pending returns.

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type { CustomerDashboardResponse, OrderSummaryResponse } from '@caratflow/shared-types';

@Injectable()
export class CustomerPortalDashboardService extends TenantAwareService {
  private readonly logger = new Logger(CustomerPortalDashboardService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async getDashboard(
    tenantId: string,
    customerId: string,
  ): Promise<CustomerDashboardResponse> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    // Parallel fetch all dashboard data
    const [
      recentOrdersRaw,
      loyaltyExpiring,
      activeKittyCount,
      activeGoldSavingsCount,
      wishlistCount,
      pendingReturns,
      upcomingKittyInstallments,
      upcomingGoldSavingsInstallments,
    ] = await Promise.all([
      // Recent 3 orders
      this.prisma.onlineOrder.findMany({
        where: { tenantId, customerId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
          items: {
            take: 1,
            include: { product: { select: { images: true } } },
          },
          _count: { select: { items: true } },
        },
      }),

      // Points expiring in 30 days
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

      // Active kitty memberships count
      this.prisma.kittyMember.count({
        where: { tenantId, customerId, status: 'ACTIVE' },
      }),

      // Active gold savings memberships count
      this.prisma.goldSavingsMember.count({
        where: { tenantId, customerId, status: 'ACTIVE' },
      }),

      // Wishlist count
      this.prisma.wishlist.count({
        where: { tenantId, customerId },
      }),

      // Pending returns count
      this.prisma.saleReturn.count({
        where: { tenantId, customerId, status: { in: ['DRAFT', 'APPROVED'] } },
      }),

      // Upcoming kitty installments (next 30 days)
      this.prisma.kittyInstallment.findMany({
        where: {
          tenantId,
          kittyMember: { customerId, status: 'ACTIVE' },
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
        include: { kittyMember: { include: { kittyScheme: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),

      // Upcoming gold savings installments (next 30 days)
      this.prisma.goldSavingsInstallment.findMany({
        where: {
          tenantId,
          goldSavingsMember: { customerId, status: 'ACTIVE' },
          status: { in: ['PENDING', 'OVERDUE'] },
          dueDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
        include: { goldSavingsMember: { include: { goldSavingsScheme: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
    ]);

    // Map recent orders
    const recentOrders: OrderSummaryResponse[] = recentOrdersRaw.map((order) => {
      const firstItem = order.items[0];
      let thumbnail: string | null = null;
      if (firstItem?.product?.images) {
        const images = firstItem.product.images as string[];
        thumbnail = images.length > 0 ? (images[0] ?? null) : null;
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status as OrderSummaryResponse['status'],
        totalPaise: Number(order.totalPaise),
        currencyCode: order.currencyCode,
        itemCount: order._count.items,
        thumbnail,
        placedAt: order.placedAt,
        createdAt: order.createdAt,
      };
    });

    // Build upcoming installments list
    const upcomingInstallments: CustomerDashboardResponse['upcomingInstallments'] = [];

    for (const inst of upcomingKittyInstallments) {
      upcomingInstallments.push({
        schemeName: inst.kittyMember.kittyScheme.schemeName,
        dueDate: inst.dueDate,
        amountPaise: Number(inst.amountPaise),
      });
    }

    for (const inst of upcomingGoldSavingsInstallments) {
      upcomingInstallments.push({
        schemeName: inst.goldSavingsMember.goldSavingsScheme.schemeName,
        dueDate: inst.dueDate,
        amountPaise: Number(inst.amountPaise),
      });
    }

    upcomingInstallments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    // Personalized greeting based on time of day
    const hour = new Date().getHours();
    let timeGreeting: string;
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 17) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';

    return {
      greeting: `${timeGreeting}, ${customer.firstName}!`,
      recentOrders,
      loyalty: {
        currentPoints: customer.loyaltyPoints,
        tier: customer.loyaltyTier,
        pointsExpiringSoon: loyaltyExpiring._sum.points ?? 0,
      },
      activeSchemesCount: activeKittyCount + activeGoldSavingsCount,
      upcomingInstallments,
      wishlistCount,
      pendingReturns,
    };
  }
}
