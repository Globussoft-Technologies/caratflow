// ─── CRM Feedback Service ──────────────────────────────────────
// Collect, review, action customer feedback. Average rating by period.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type { FeedbackInput } from '@caratflow/shared-types';

@Injectable()
export class CrmFeedbackService extends TenantAwareService {
  private readonly logger = new Logger(CrmFeedbackService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createFeedback(tenantId: string, userId: string, input: FeedbackInput) {
    return this.prisma.feedback.create({
      data: {
        tenantId,
        customerId: input.customerId,
        feedbackType: input.feedbackType,
        rating: input.rating,
        comment: input.comment,
        saleId: input.saleId,
        status: 'NEW',
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async getFeedback(tenantId: string, feedbackId: string) {
    return this.prisma.feedback.findFirstOrThrow({
      where: { id: feedbackId, tenantId },
      include: { customer: { select: { firstName: true, lastName: true } } },
    });
  }

  async listFeedback(tenantId: string, page = 1, limit = 20, status?: string, feedbackType?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (feedbackType) where.feedbackType = feedbackType;

    const [items, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where: where as Parameters<typeof this.prisma.feedback.findMany>[0]['where'],
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { customer: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.feedback.count({
        where: where as Parameters<typeof this.prisma.feedback.count>[0]['where'],
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  /** Mark feedback as reviewed */
  async reviewFeedback(tenantId: string, userId: string, feedbackId: string) {
    await this.prisma.feedback.findFirstOrThrow({
      where: { id: feedbackId, tenantId },
    });
    return this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: 'REVIEWED',
        reviewedBy: userId,
        reviewedAt: new Date(),
        updatedBy: userId,
      },
    });
  }

  /** Mark feedback as actioned */
  async actionFeedback(tenantId: string, userId: string, feedbackId: string) {
    await this.prisma.feedback.findFirstOrThrow({
      where: { id: feedbackId, tenantId },
    });
    return this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: 'ACTIONED',
        reviewedBy: userId,
        reviewedAt: new Date(),
        updatedBy: userId,
      },
    });
  }

  /** Average rating by period */
  async getAverageRating(tenantId: string, from?: Date, to?: Date) {
    const where: Record<string, unknown> = { tenantId };
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.gte = from;
      if (to) createdAt.lte = to;
      where.createdAt = createdAt;
    }

    const [result, byType] = await Promise.all([
      this.prisma.feedback.aggregate({
        where: where as Parameters<typeof this.prisma.feedback.aggregate>[0]['where'],
        _avg: { rating: true },
        _count: true,
      }),
      this.prisma.feedback.groupBy({
        by: ['feedbackType'],
        where: where as Parameters<typeof this.prisma.feedback.groupBy>[0]['where'],
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    return {
      averageRating: result._avg.rating ?? 0,
      totalCount: result._count,
      byType: byType.map((g) => ({
        feedbackType: g.feedbackType,
        averageRating: g._avg.rating ?? 0,
        count: g._count,
      })),
    };
  }

  /** Rating distribution (1-5 stars) */
  async getRatingDistribution(tenantId: string) {
    const groups = await this.prisma.feedback.groupBy({
      by: ['rating'],
      where: { tenantId },
      _count: true,
      orderBy: { rating: 'asc' },
    });

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const g of groups) {
      distribution[g.rating] = g._count;
    }
    return distribution;
  }
}
