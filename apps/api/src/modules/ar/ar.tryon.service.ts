// ─── AR Try-On Session Service ────────────────────────────────
// Tracks try-on sessions for analytics: start, end, metrics.

import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  TryOnSessionInput,
  TryOnSessionEnd,
  TryOnSessionResponse,
  TryOnConfig,
  ArAnalytics,
  ArAnalyticsFilter,
} from '@caratflow/shared-types';
import { ArJewelryCategory } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ArTryOnService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get try-on configuration for a product (overlay image + positioning).
   */
  async getTryOnConfig(tenantId: string, productId: string): Promise<TryOnConfig> {
    const product = await this.prisma.product.findFirst({
      where: this.tenantWhere(tenantId, { id: productId }) as { tenantId: string; id: string },
      select: { id: true, name: true, images: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Find the 2D overlay asset for try-on
    const overlayAsset = await this.prisma.arAsset.findFirst({
      where: {
        tenantId,
        productId,
        assetType: 'AR_OVERLAY_2D',
        isActive: true,
        processingStatus: 'READY',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Find 3D model if available
    const modelAsset = await this.prisma.arAsset.findFirst({
      where: {
        tenantId,
        productId,
        assetType: 'AR_MODEL_3D',
        isActive: true,
        processingStatus: 'READY',
      },
      orderBy: { createdAt: 'desc' },
    });

    const images = product.images as Array<{ url: string }> | null;
    const primaryImage = images?.[0]?.url ?? '';

    const metadata = (overlayAsset?.metadata ?? {}) as Record<string, unknown>;

    return {
      productId: product.id,
      productName: product.name,
      productImage: primaryImage,
      category: (overlayAsset?.category ?? modelAsset?.category ?? 'RING') as ArJewelryCategory,
      modelUrl: modelAsset?.fileUrl ?? null,
      overlayUrl: overlayAsset?.fileUrl ?? null,
      overlayPositioning: {
        scale: (metadata.scale as number) ?? 1.0,
        offsetX: (metadata.offsetX as number) ?? 0,
        offsetY: (metadata.offsetY as number) ?? 0,
        rotation: (metadata.rotation as number) ?? 0,
      },
    };
  }

  /**
   * Start a new try-on session and return session ID.
   */
  async startSession(
    tenantId: string,
    input: TryOnSessionInput,
  ): Promise<TryOnSessionResponse> {
    const sessionId = `tryon-${uuidv4().substring(0, 8)}-${Date.now()}`;

    const session = await this.prisma.arTryOnSession.create({
      data: {
        id: uuidv4(),
        tenantId,
        customerId: input.customerId ?? null,
        sessionId,
        productId: input.productId,
        deviceType: input.deviceType,
        duration: 0,
        screenshotTaken: false,
        addedToCart: false,
      },
    });

    return this.mapSessionToResponse(session);
  }

  /**
   * End a try-on session with final metrics.
   */
  async endSession(
    tenantId: string,
    input: TryOnSessionEnd,
  ): Promise<TryOnSessionResponse> {
    const session = await this.prisma.arTryOnSession.findFirst({
      where: { tenantId, sessionId: input.sessionId },
    });

    if (!session) {
      throw new NotFoundException('Try-on session not found');
    }

    const updated = await this.prisma.arTryOnSession.update({
      where: { id: session.id },
      data: {
        duration: input.duration,
        screenshotTaken: input.screenshotTaken,
        sharedVia: input.sharedVia ?? null,
        addedToCart: input.addedToCart,
      },
    });

    return this.mapSessionToResponse(updated);
  }

  /**
   * Get AR try-on analytics for a tenant.
   */
  async getAnalytics(
    tenantId: string,
    filter: ArAnalyticsFilter,
  ): Promise<ArAnalytics> {
    const where: Record<string, unknown> = { tenantId };

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) (where.createdAt as Record<string, unknown>).gte = filter.dateFrom;
      if (filter.dateTo) (where.createdAt as Record<string, unknown>).lte = filter.dateTo;
    }

    // Build asset filter for category
    let productIdsForCategory: string[] | undefined;
    if (filter.category) {
      const assets = await this.prisma.arAsset.findMany({
        where: { tenantId, category: filter.category, isActive: true },
        select: { productId: true },
        distinct: ['productId'],
      });
      productIdsForCategory = assets.map((a) => a.productId);
      where.productId = { in: productIdsForCategory };
    }

    const [
      totalSessions,
      sessionsWithCart,
      sessionsWithScreenshot,
      sessionsWithShare,
      avgDurationResult,
      deviceBreakdownRaw,
      topProductsRaw,
    ] = await Promise.all([
      this.prisma.arTryOnSession.count({ where }),
      this.prisma.arTryOnSession.count({ where: { ...where, addedToCart: true } }),
      this.prisma.arTryOnSession.count({ where: { ...where, screenshotTaken: true } }),
      this.prisma.arTryOnSession.count({ where: { ...where, sharedVia: { not: null } } }),
      this.prisma.arTryOnSession.aggregate({ where, _avg: { duration: true } }),
      this.prisma.arTryOnSession.groupBy({
        by: ['deviceType'],
        where,
        _count: { id: true },
      }),
      this.prisma.arTryOnSession.groupBy({
        by: ['productId'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Get product names for top products
    const topProductIds = topProductsRaw.map((p) => p.productId);
    const products = topProductIds.length > 0
      ? await this.prisma.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, name: true },
        })
      : [];
    const productNameMap = new Map(products.map((p) => [p.id, p.name]));

    // Get per-product cart conversions
    const topProductCartCounts = topProductIds.length > 0
      ? await this.prisma.arTryOnSession.groupBy({
          by: ['productId'],
          where: { ...where, productId: { in: topProductIds }, addedToCart: true },
          _count: { id: true },
        })
      : [];
    const cartCountMap = new Map(
      topProductCartCounts.map((p) => [p.productId, p._count.id]),
    );

    // Get category breakdown from assets
    const categoryBreakdownRaw = await this.prisma.arAsset.groupBy({
      by: ['category'],
      where: { tenantId, isActive: true },
      _count: { id: true },
    });

    // Daily trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailySessions = await this.prisma.arTryOnSession.findMany({
      where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, addedToCart: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, { sessions: number; conversions: number }>();
    for (const session of dailySessions) {
      const dateKey = session.createdAt.toISOString().split('T')[0]!;
      const entry = dailyMap.get(dateKey) ?? { sessions: 0, conversions: 0 };
      entry.sessions++;
      if (session.addedToCart) entry.conversions++;
      dailyMap.set(dateKey, entry);
    }

    const totalCategoryAssets = categoryBreakdownRaw.reduce((sum, c) => sum + c._count.id, 0);

    return {
      totalSessions,
      avgDuration: Math.round(avgDurationResult._avg.duration ?? 0),
      conversionRate: totalSessions > 0 ? Number(((sessionsWithCart / totalSessions) * 100).toFixed(1)) : 0,
      screenshotRate: totalSessions > 0 ? Number(((sessionsWithScreenshot / totalSessions) * 100).toFixed(1)) : 0,
      shareRate: totalSessions > 0 ? Number(((sessionsWithShare / totalSessions) * 100).toFixed(1)) : 0,
      topProducts: topProductsRaw.map((p) => ({
        productId: p.productId,
        productName: productNameMap.get(p.productId) ?? 'Unknown',
        sessionCount: p._count.id,
        conversionRate: p._count.id > 0
          ? Number((((cartCountMap.get(p.productId) ?? 0) / p._count.id) * 100).toFixed(1))
          : 0,
      })),
      deviceBreakdown: deviceBreakdownRaw.map((d) => ({
        deviceType: d.deviceType as ArAnalytics['deviceBreakdown'][number]['deviceType'],
        count: d._count.id,
        percentage: totalSessions > 0 ? Number(((d._count.id / totalSessions) * 100).toFixed(1)) : 0,
      })),
      categoryBreakdown: categoryBreakdownRaw.map((c) => ({
        category: c.category as ArAnalytics['categoryBreakdown'][number]['category'],
        count: c._count.id,
        percentage: totalCategoryAssets > 0
          ? Number(((c._count.id / totalCategoryAssets) * 100).toFixed(1))
          : 0,
      })),
      dailyTrend: Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        sessions: data.sessions,
        conversions: data.conversions,
      })),
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapSessionToResponse(session: Record<string, unknown>): TryOnSessionResponse {
    return {
      id: session.id as string,
      sessionId: session.sessionId as string,
      productId: session.productId as string,
      deviceType: session.deviceType as TryOnSessionResponse['deviceType'],
      duration: session.duration as number,
      screenshotTaken: session.screenshotTaken as boolean,
      sharedVia: (session.sharedVia as string) ?? null,
      addedToCart: session.addedToCart as boolean,
      createdAt: new Date(session.createdAt as string),
    };
  }
}
