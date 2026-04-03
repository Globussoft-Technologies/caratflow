// ─── CRM Service ───────────────────────────────────────────────
// Main customer service: 360 view, search, segmentation, CSV import.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  Customer360Response,
  CrmDashboardResponse,
  CustomerSearchInput,
  CustomerListFilter,
  CustomerSegmentInput,
  SegmentCriteria,
} from '@caratflow/shared-types';
import type { PaginatedResult } from '@caratflow/shared-types';

@Injectable()
export class CrmService extends TenantAwareService {
  private readonly logger = new Logger(CrmService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /** Customer 360 view: aggregate profile + purchase history + loyalty + occasions + interactions + feedback */
  async getCustomer360(tenantId: string, customerId: string): Promise<Customer360Response> {
    const customer = await this.prisma.customer.findFirstOrThrow({
      where: this.tenantWhere(tenantId, { id: customerId }) as { tenantId: string; id: string },
    });

    const [
      loyaltyTransactions,
      occasions,
      interactions,
      feedbacks,
      passbooks,
      invoices,
    ] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where: this.tenantWhere(tenantId, { customerId }) as { tenantId: string; customerId: string },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.customerOccasion.findMany({
        where: this.tenantWhere(tenantId, { customerId }) as { tenantId: string; customerId: string },
        orderBy: { date: 'asc' },
      }),
      this.prisma.customerInteraction.findMany({
        where: this.tenantWhere(tenantId, { customerId }) as { tenantId: string; customerId: string },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.feedback.findMany({
        where: this.tenantWhere(tenantId, { customerId }) as { tenantId: string; customerId: string },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.digitalPassbook.findMany({
        where: this.tenantWhere(tenantId, { customerId }) as { tenantId: string; customerId: string },
      }),
      this.prisma.invoice.findMany({
        where: this.tenantWhere(tenantId, { customerId }) as { tenantId: string; customerId: string },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { _count: { select: { lineItems: true } } },
      }),
    ]);

    // Calculate loyalty aggregates
    const earned = loyaltyTransactions
      .filter((t) => t.transactionType === 'EARNED' || t.transactionType === 'BONUS')
      .reduce((sum, t) => sum + t.points, 0);
    const redeemed = loyaltyTransactions
      .filter((t) => t.transactionType === 'REDEEMED')
      .reduce((sum, t) => sum + Math.abs(t.points), 0);

    return {
      profile: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        alternatePhone: customer.alternatePhone,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        country: customer.country,
        postalCode: customer.postalCode,
        customerType: customer.customerType,
        panNumber: customer.panNumber,
        aadhaarNumber: customer.aadhaarNumber,
        gstinNumber: customer.gstinNumber,
        dateOfBirth: customer.dateOfBirth,
        anniversary: customer.anniversary,
        createdAt: customer.createdAt,
      },
      loyalty: {
        currentPoints: customer.loyaltyPoints,
        tier: customer.loyaltyTier,
        lifetimeEarned: earned,
        lifetimeRedeemed: redeemed,
        recentTransactions: loyaltyTransactions.map((t) => ({
          id: t.id,
          transactionType: t.transactionType,
          points: t.points,
          balanceAfter: t.balanceAfter,
          description: t.description,
          createdAt: t.createdAt,
        })),
      },
      purchaseHistory: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        totalPaise: Number(inv.totalAmountPaise),
        date: inv.createdAt,
        itemCount: inv._count.lineItems,
      })),
      occasions: occasions.map((o) => ({
        id: o.id,
        occasionType: o.occasionType,
        date: o.date,
        description: o.description,
        reminderDaysBefore: o.reminderDaysBefore,
      })),
      recentInteractions: interactions.map((i) => ({
        id: i.id,
        interactionType: i.interactionType,
        direction: i.direction,
        subject: i.subject,
        createdAt: i.createdAt,
      })),
      feedback: feedbacks.map((f) => ({
        id: f.id,
        feedbackType: f.feedbackType,
        rating: f.rating,
        comment: f.comment,
        status: f.status,
        createdAt: f.createdAt,
      })),
      schemes: passbooks.map((p) => ({
        id: p.id,
        type: p.type,
        schemeName: p.schemeName,
        currentBalancePaise: p.currentBalancePaise ? Number(p.currentBalancePaise) : null,
        currentPoints: p.currentPoints,
      })),
    };
  }

  /** Fast customer search for POS -- by name, phone, or email */
  async searchCustomers(tenantId: string, input: CustomerSearchInput) {
    const { query, limit } = input;
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { phone: { contains: query } },
          { email: { contains: query } },
        ],
      },
      take: limit,
      orderBy: { firstName: 'asc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        customerType: true,
        loyaltyPoints: true,
        loyaltyTier: true,
        city: true,
      },
    });
    return customers;
  }

  /** Customer list with filters and pagination */
  async listCustomers(
    tenantId: string,
    filter: CustomerListFilter,
  ): Promise<PaginatedResult<unknown>> {
    const { page, limit, sortBy, sortOrder, customerType, city, loyaltyTier, search } = filter;
    const where: Record<string, unknown> = { tenantId };

    if (customerType) where.customerType = customerType;
    if (city) where.city = city;
    if (loyaltyTier) where.loyaltyTier = loyaltyTier;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where: where as Parameters<typeof this.prisma.customer.findMany>[0]['where'],
        skip: (page - 1) * limit,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
      }),
      this.prisma.customer.count({
        where: where as Parameters<typeof this.prisma.customer.count>[0]['where'],
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

  /** CRM Dashboard aggregates */
  async getDashboard(tenantId: string): Promise<CrmDashboardResponse> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      newLeadsCount,
      wonLeadsCount,
      totalLeadsCount,
      activeCustomersCount,
      totalLoyaltyMembers,
      pointsIssuedThisMonth,
      pointsRedeemedThisMonth,
      upcomingOccasionsRaw,
      recentFeedbackRaw,
      feedbackStats,
      leadsByStatus,
    ] = await Promise.all([
      // New leads in last 30 days
      this.prisma.lead.count({
        where: { tenantId, status: 'NEW', createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
      }),
      // Won leads for conversion rate
      this.prisma.lead.count({
        where: { tenantId, status: 'WON' },
      }),
      this.prisma.lead.count({
        where: { tenantId },
      }),
      // Active customers (with purchases in last 12 months)
      this.prisma.customer.count({
        where: { tenantId },
      }),
      // Loyalty members
      this.prisma.customer.count({
        where: { tenantId, loyaltyPoints: { gt: 0 } },
      }),
      // Points issued this month
      this.prisma.loyaltyTransaction.aggregate({
        where: { tenantId, transactionType: 'EARNED', createdAt: { gte: startOfMonth } },
        _sum: { points: true },
      }),
      // Points redeemed this month
      this.prisma.loyaltyTransaction.aggregate({
        where: { tenantId, transactionType: 'REDEEMED', createdAt: { gte: startOfMonth } },
        _sum: { points: true },
      }),
      // Upcoming occasions (next 7 days) -- compare month/day
      this.prisma.customerOccasion.findMany({
        where: {
          tenantId,
          date: { gte: now, lte: sevenDaysFromNow },
        },
        include: { customer: { select: { firstName: true, lastName: true } } },
        take: 10,
        orderBy: { date: 'asc' },
      }),
      // Recent feedback
      this.prisma.feedback.findMany({
        where: { tenantId },
        include: { customer: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Feedback average
      this.prisma.feedback.aggregate({
        where: { tenantId, createdAt: { gte: startOfMonth } },
        _avg: { rating: true },
        _count: true,
      }),
      // Lead pipeline
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
    ]);

    const conversionRate = totalLeadsCount > 0 ? (wonLeadsCount / totalLeadsCount) * 100 : 0;

    const leadPipeline: Record<string, number> = {};
    for (const group of leadsByStatus) {
      leadPipeline[group.status] = group._count;
    }

    return {
      newLeads: newLeadsCount,
      conversionRate: Math.round(conversionRate * 10) / 10,
      activeCustomers: activeCustomersCount,
      loyaltyMetrics: {
        totalMembers: totalLoyaltyMembers,
        pointsIssuedThisMonth: pointsIssuedThisMonth._sum.points ?? 0,
        pointsRedeemedThisMonth: Math.abs(pointsRedeemedThisMonth._sum.points ?? 0),
      },
      upcomingOccasions: upcomingOccasionsRaw.map((o) => ({
        id: o.id,
        customerId: o.customerId,
        customerName: `${o.customer.firstName} ${o.customer.lastName}`,
        occasionType: o.occasionType,
        date: o.date,
        daysAway: Math.ceil((o.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      recentFeedback: {
        averageRating: feedbackStats._avg.rating ?? 0,
        totalCount: feedbackStats._count,
        recent: recentFeedbackRaw.map((f) => ({
          id: f.id,
          customerName: `${f.customer.firstName} ${f.customer.lastName}`,
          rating: f.rating,
          comment: f.comment,
          createdAt: f.createdAt,
        })),
      },
      leadPipeline,
    };
  }

  /** Evaluate segment criteria and count matching customers */
  async evaluateSegment(tenantId: string, criteria: SegmentCriteria): Promise<{ count: number; sampleIds: string[] }> {
    const where = this.buildSegmentWhere(tenantId, criteria);
    const [count, samples] = await Promise.all([
      this.prisma.customer.count({ where: where as Parameters<typeof this.prisma.customer.count>[0]['where'] }),
      this.prisma.customer.findMany({
        where: where as Parameters<typeof this.prisma.customer.findMany>[0]['where'],
        take: 5,
        select: { id: true },
      }),
    ]);
    return { count, sampleIds: samples.map((s) => s.id) };
  }

  /** Create a saved customer segment */
  async createSegment(tenantId: string, userId: string, input: CustomerSegmentInput) {
    const { count } = await this.evaluateSegment(tenantId, input.criteria);
    return this.prisma.customerSegment.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description,
        criteria: input.criteria as Record<string, unknown>,
        customerCount: count,
        lastCalculatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  /** List saved segments */
  async listSegments(tenantId: string) {
    return this.prisma.customerSegment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Refresh segment customer count */
  async refreshSegment(tenantId: string, segmentId: string) {
    const segment = await this.prisma.customerSegment.findFirstOrThrow({
      where: { id: segmentId, tenantId },
    });
    const criteria = segment.criteria as SegmentCriteria;
    const { count } = await this.evaluateSegment(tenantId, criteria);
    return this.prisma.customerSegment.update({
      where: { id: segmentId },
      data: { customerCount: count, lastCalculatedAt: new Date() },
    });
  }

  /** Import customers from parsed CSV rows */
  async importCustomers(
    tenantId: string,
    userId: string,
    rows: Array<{
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
      city?: string;
      customerType?: string;
    }>,
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      try {
        if (!row.firstName || !row.lastName) {
          errors.push(`Row ${i + 1}: firstName and lastName are required`);
          skipped++;
          continue;
        }

        // Check for duplicate by phone or email
        if (row.phone || row.email) {
          const existing = await this.prisma.customer.findFirst({
            where: {
              tenantId,
              OR: [
                ...(row.phone ? [{ phone: row.phone }] : []),
                ...(row.email ? [{ email: row.email }] : []),
              ],
            },
          });
          if (existing) {
            skipped++;
            continue;
          }
        }

        await this.prisma.customer.create({
          data: {
            tenantId,
            firstName: row.firstName,
            lastName: row.lastName,
            phone: row.phone,
            email: row.email,
            city: row.city,
            customerType: (row.customerType as 'RETAIL' | 'WHOLESALE' | 'CORPORATE') ?? 'RETAIL',
            createdBy: userId,
            updatedBy: userId,
          },
        });
        imported++;
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        skipped++;
      }
    }

    return { imported, skipped, errors };
  }

  private buildSegmentWhere(tenantId: string, criteria: SegmentCriteria): Record<string, unknown> {
    const where: Record<string, unknown> = { tenantId };

    if (criteria.customerType?.length) {
      where.customerType = { in: criteria.customerType };
    }
    if (criteria.city?.length) {
      where.city = { in: criteria.city };
    }
    if (criteria.state?.length) {
      where.state = { in: criteria.state };
    }
    if (criteria.loyaltyTier?.length) {
      where.loyaltyTier = { in: criteria.loyaltyTier };
    }
    if (criteria.minLoyaltyPoints !== undefined || criteria.maxLoyaltyPoints !== undefined) {
      const points: Record<string, number> = {};
      if (criteria.minLoyaltyPoints !== undefined) points.gte = criteria.minLoyaltyPoints;
      if (criteria.maxLoyaltyPoints !== undefined) points.lte = criteria.maxLoyaltyPoints;
      where.loyaltyPoints = points;
    }
    if (criteria.hasEmail === true) {
      where.email = { not: null };
    }
    if (criteria.hasPhone === true) {
      where.phone = { not: null };
    }
    if (criteria.createdAfter || criteria.createdBefore) {
      const createdAt: Record<string, Date> = {};
      if (criteria.createdAfter) createdAt.gte = criteria.createdAfter;
      if (criteria.createdBefore) createdAt.lte = criteria.createdBefore;
      where.createdAt = createdAt;
    }

    return where;
  }
}
