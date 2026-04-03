// ─── E-Commerce tRPC Router ───────────────────────────────────
// All tRPC procedures for the e-commerce module.

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { EcommerceService } from './ecommerce.service';
import { EcommerceCatalogService } from './ecommerce.catalog.service';
import { EcommerceShippingService } from './ecommerce.shipping.service';
import { EcommercePaymentService } from './ecommerce.payment.service';
import { EcommerceWebhookService } from './ecommerce.webhook.service';
import { EcommerceClickCollectService } from './ecommerce.click-collect.service';
import {
  SalesChannelInputSchema,
  SalesChannelListFilterSchema,
  CatalogSyncInputSchema,
  CatalogListFilterSchema,
  OnlineOrderInputSchema,
  OnlineOrderListFilterSchema,
  OrderStatusUpdateSchema,
  ShipmentInputSchema,
  ShipmentListFilterSchema,
  TrackingUpdateSchema,
  PaymentGatewayInputSchema,
  OnlinePaymentInputSchema,
  PaymentListFilterSchema,
  ClickAndCollectInputSchema,
  ClickAndCollectListFilterSchema,
  ProductReviewInputSchema,
  ReviewListFilterSchema,
  PaginationSchema,
} from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EcommerceTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly prisma: PrismaService,
    private readonly orderService: EcommerceService,
    private readonly catalogService: EcommerceCatalogService,
    private readonly shippingService: EcommerceShippingService,
    private readonly paymentService: EcommercePaymentService,
    private readonly webhookService: EcommerceWebhookService,
    private readonly clickCollectService: EcommerceClickCollectService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── Dashboard ────────────────────────────────────────────
      getDashboard: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.orderService.getDashboard(ctx.tenantId),
        ),

      // ─── Sales Channels ───────────────────────────────────────
      createChannel: this.trpc.authedProcedure
        .input(SalesChannelInputSchema)
        .mutation(async ({ ctx, input }) => {
          const channel = await this.prisma.salesChannel.create({
            data: {
              id: uuidv4(),
              tenantId: ctx.tenantId,
              name: input.name,
              channelType: input.channelType,
              apiKey: input.apiKey ?? null,
              apiSecret: input.apiSecret ?? null,
              storeUrl: input.storeUrl ?? null,
              webhookSecret: input.webhookSecret ?? null,
              settings: input.settings ?? undefined,
              isActive: input.isActive ?? true,
              createdBy: ctx.userId,
              updatedBy: ctx.userId,
            },
          });
          return {
            id: channel.id,
            tenantId: channel.tenantId,
            name: channel.name,
            channelType: channel.channelType,
            storeUrl: channel.storeUrl,
            settings: channel.settings,
            isActive: channel.isActive,
            lastSyncAt: channel.lastSyncAt,
            createdAt: channel.createdAt,
            updatedAt: channel.updatedAt,
          };
        }),

      getChannel: this.trpc.authedProcedure
        .input(z.object({ channelId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          const channel = await this.prisma.salesChannel.findFirst({
            where: { id: input.channelId, tenantId: ctx.tenantId },
          });
          if (!channel) throw new Error('Channel not found');
          return {
            id: channel.id,
            tenantId: channel.tenantId,
            name: channel.name,
            channelType: channel.channelType,
            storeUrl: channel.storeUrl,
            settings: channel.settings,
            isActive: channel.isActive,
            lastSyncAt: channel.lastSyncAt,
            createdAt: channel.createdAt,
            updatedAt: channel.updatedAt,
          };
        }),

      listChannels: this.trpc.authedProcedure
        .input(z.object({
          filters: SalesChannelListFilterSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(async ({ ctx, input }) => {
          const where: Record<string, unknown> = { tenantId: ctx.tenantId };
          if (input.filters?.channelType) where.channelType = input.filters.channelType;
          if (input.filters?.isActive !== undefined) where.isActive = input.filters.isActive;
          if (input.filters?.search) {
            where.OR = [{ name: { contains: input.filters.search } }];
          }

          const channels = await this.prisma.salesChannel.findMany({
            where,
            orderBy: { createdAt: 'desc' },
          });

          return channels.map((ch) => ({
            id: ch.id,
            tenantId: ch.tenantId,
            name: ch.name,
            channelType: ch.channelType,
            storeUrl: ch.storeUrl,
            settings: ch.settings,
            isActive: ch.isActive,
            lastSyncAt: ch.lastSyncAt,
            createdAt: ch.createdAt,
            updatedAt: ch.updatedAt,
          }));
        }),

      updateChannel: this.trpc.authedProcedure
        .input(z.object({
          channelId: z.string().uuid(),
          data: SalesChannelInputSchema.partial(),
        }))
        .mutation(async ({ ctx, input }) => {
          const updated = await this.prisma.salesChannel.update({
            where: { id: input.channelId },
            data: {
              ...input.data,
              updatedBy: ctx.userId,
            },
          });
          return {
            id: updated.id,
            tenantId: updated.tenantId,
            name: updated.name,
            channelType: updated.channelType,
            storeUrl: updated.storeUrl,
            settings: updated.settings,
            isActive: updated.isActive,
            lastSyncAt: updated.lastSyncAt,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          };
        }),

      // ─── Catalog ──────────────────────────────────────────────
      syncProduct: this.trpc.authedProcedure
        .input(CatalogSyncInputSchema)
        .mutation(({ ctx, input }) =>
          this.catalogService.syncProduct(ctx.tenantId, ctx.userId, input),
        ),

      bulkSyncProducts: this.trpc.authedProcedure
        .input(z.object({
          channelId: z.string().uuid(),
          productIds: z.array(z.string().uuid()),
        }))
        .mutation(({ ctx, input }) =>
          this.catalogService.bulkSync(ctx.tenantId, ctx.userId, input.channelId, input.productIds),
        ),

      getCatalogItem: this.trpc.authedProcedure
        .input(z.object({ catalogItemId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.catalogService.getCatalogItem(ctx.tenantId, input.catalogItemId),
        ),

      listCatalogItems: this.trpc.authedProcedure
        .input(z.object({
          filters: CatalogListFilterSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.catalogService.listCatalogItems(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      deleteCatalogItem: this.trpc.authedProcedure
        .input(z.object({ catalogItemId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.catalogService.deleteCatalogItem(ctx.tenantId, input.catalogItemId),
        ),

      // ─── Orders ───────────────────────────────────────────────
      createOrder: this.trpc.authedProcedure
        .input(OnlineOrderInputSchema)
        .mutation(({ ctx, input }) =>
          this.orderService.createOrder(ctx.tenantId, ctx.userId, input),
        ),

      getOrder: this.trpc.authedProcedure
        .input(z.object({ orderId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.orderService.getOrder(ctx.tenantId, input.orderId),
        ),

      listOrders: this.trpc.authedProcedure
        .input(z.object({
          filters: OnlineOrderListFilterSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.orderService.listOrders(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      updateOrderStatus: this.trpc.authedProcedure
        .input(OrderStatusUpdateSchema)
        .mutation(({ ctx, input }) =>
          this.orderService.updateOrderStatus(ctx.tenantId, ctx.userId, input),
        ),

      cancelOrder: this.trpc.authedProcedure
        .input(z.object({ orderId: z.string().uuid(), reason: z.string().min(1) }))
        .mutation(({ ctx, input }) =>
          this.orderService.cancelOrder(ctx.tenantId, ctx.userId, input.orderId, input.reason),
        ),

      refundOrder: this.trpc.authedProcedure
        .input(z.object({ orderId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.orderService.refundOrder(ctx.tenantId, ctx.userId, input.orderId),
        ),

      // ─── Shipments ────────────────────────────────────────────
      createShipment: this.trpc.authedProcedure
        .input(ShipmentInputSchema)
        .mutation(({ ctx, input }) =>
          this.shippingService.createShipment(ctx.tenantId, ctx.userId, input),
        ),

      getShipment: this.trpc.authedProcedure
        .input(z.object({ shipmentId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.shippingService.getShipment(ctx.tenantId, input.shipmentId),
        ),

      listShipments: this.trpc.authedProcedure
        .input(z.object({
          filters: ShipmentListFilterSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.shippingService.listShipments(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      updateTracking: this.trpc.authedProcedure
        .input(TrackingUpdateSchema)
        .mutation(({ ctx, input }) =>
          this.shippingService.updateTracking(ctx.tenantId, ctx.userId, input),
        ),

      getShipmentsByOrder: this.trpc.authedProcedure
        .input(z.object({ orderId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.shippingService.getShipmentsByOrder(ctx.tenantId, input.orderId),
        ),

      generateLabel: this.trpc.authedProcedure
        .input(z.object({ shipmentId: z.string().uuid(), carrier: z.string() }))
        .mutation(({ ctx, input }) =>
          this.shippingService.generateLabel(ctx.tenantId, input.shipmentId, input.carrier),
        ),

      // ─── Payment Gateways ─────────────────────────────────────
      createGateway: this.trpc.authedProcedure
        .input(PaymentGatewayInputSchema)
        .mutation(({ ctx, input }) =>
          this.paymentService.createGateway(ctx.tenantId, ctx.userId, input),
        ),

      getGateway: this.trpc.authedProcedure
        .input(z.object({ gatewayId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.paymentService.getGateway(ctx.tenantId, input.gatewayId),
        ),

      listGateways: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.paymentService.listGateways(ctx.tenantId),
        ),

      updateGateway: this.trpc.authedProcedure
        .input(z.object({
          gatewayId: z.string().uuid(),
          data: PaymentGatewayInputSchema.partial(),
        }))
        .mutation(({ ctx, input }) =>
          this.paymentService.updateGateway(ctx.tenantId, ctx.userId, input.gatewayId, input.data),
        ),

      // ─── Online Payments ──────────────────────────────────────
      initiatePayment: this.trpc.authedProcedure
        .input(OnlinePaymentInputSchema)
        .mutation(({ ctx, input }) =>
          this.paymentService.initiatePayment(ctx.tenantId, ctx.userId, input),
        ),

      listPayments: this.trpc.authedProcedure
        .input(z.object({
          filters: PaymentListFilterSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.paymentService.listPayments(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      refundPayment: this.trpc.authedProcedure
        .input(z.object({
          paymentId: z.string().uuid(),
          refundAmountPaise: z.number().int().positive().optional(),
        }))
        .mutation(({ ctx, input }) =>
          this.paymentService.refundPayment(ctx.tenantId, input.paymentId, input.refundAmountPaise),
        ),

      // ─── Webhooks ─────────────────────────────────────────────
      handleWebhook: this.trpc.authedProcedure
        .input(z.object({
          source: z.string(),
          eventType: z.string(),
          payload: z.record(z.unknown()),
          channelId: z.string().uuid().optional(),
          gatewayId: z.string().uuid().optional(),
        }))
        .mutation(({ ctx, input }) =>
          this.webhookService.handleWebhook(
            ctx.tenantId,
            input.source,
            input.eventType,
            input.payload,
            input.channelId,
            input.gatewayId,
          ),
        ),

      retryWebhook: this.trpc.authedProcedure
        .input(z.object({ webhookLogId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.webhookService.retryWebhook(ctx.tenantId, input.webhookLogId),
        ),

      listWebhookLogs: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({
            source: z.string().optional(),
            status: z.string().optional(),
            channelId: z.string().uuid().optional(),
            gatewayId: z.string().uuid().optional(),
          }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.webhookService.listWebhookLogs(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      // ─── Click & Collect ──────────────────────────────────────
      createClickCollect: this.trpc.authedProcedure
        .input(ClickAndCollectInputSchema)
        .mutation(({ ctx, input }) =>
          this.clickCollectService.create(ctx.tenantId, ctx.userId, input),
        ),

      getClickCollect: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.clickCollectService.get(ctx.tenantId, input.id),
        ),

      listClickCollects: this.trpc.authedProcedure
        .input(z.object({
          filters: ClickAndCollectListFilterSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.clickCollectService.list(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      markClickCollectNotified: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.clickCollectService.markNotified(ctx.tenantId, ctx.userId, input.id),
        ),

      confirmClickCollectPickup: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.clickCollectService.confirmPickup(ctx.tenantId, ctx.userId, input.id),
        ),

      cancelClickCollect: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.clickCollectService.cancel(ctx.tenantId, ctx.userId, input.id),
        ),

      getClickCollectQueue: this.trpc.authedProcedure
        .input(z.object({ locationId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.clickCollectService.getQueue(ctx.tenantId, input.locationId),
        ),

      // ─── Product Reviews ──────────────────────────────────────
      createReview: this.trpc.authedProcedure
        .input(ProductReviewInputSchema)
        .mutation(async ({ ctx, input }) => {
          const review = await this.prisma.productReview.create({
            data: {
              id: uuidv4(),
              tenantId: ctx.tenantId,
              productId: input.productId,
              channelId: input.channelId ?? null,
              customerName: input.customerName,
              rating: input.rating,
              title: input.title ?? null,
              body: input.body ?? null,
              isVerified: input.isVerified ?? false,
              isPublished: false,
              createdBy: ctx.userId,
              updatedBy: ctx.userId,
            },
          });
          return {
            id: review.id,
            tenantId: review.tenantId,
            productId: review.productId,
            channelId: review.channelId,
            customerName: review.customerName,
            rating: review.rating,
            title: review.title,
            body: review.body,
            isVerified: review.isVerified,
            isPublished: review.isPublished,
            publishedAt: review.publishedAt,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
          };
        }),

      listReviews: this.trpc.authedProcedure
        .input(z.object({
          filters: ReviewListFilterSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(async ({ ctx, input }) => {
          const where: Record<string, unknown> = { tenantId: ctx.tenantId };
          const filters = input.filters ?? {};
          if (filters.productId) where.productId = filters.productId;
          if (filters.channelId) where.channelId = filters.channelId;
          if (filters.isPublished !== undefined) where.isPublished = filters.isPublished;
          if (filters.rating) where.rating = filters.rating;
          if (filters.search) {
            where.OR = [
              { title: { contains: filters.search } },
              { body: { contains: filters.search } },
              { customerName: { contains: filters.search } },
            ];
          }

          const pagination = input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' as const };

          const [items, total] = await Promise.all([
            this.prisma.productReview.findMany({
              where,
              orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
              skip: (pagination.page - 1) * pagination.limit,
              take: pagination.limit,
            }),
            this.prisma.productReview.count({ where }),
          ]);

          const totalPages = Math.ceil(total / pagination.limit);

          return {
            items: items.map((r) => ({
              id: r.id,
              tenantId: r.tenantId,
              productId: r.productId,
              channelId: r.channelId,
              customerName: r.customerName,
              rating: r.rating,
              title: r.title,
              body: r.body,
              isVerified: r.isVerified,
              isPublished: r.isPublished,
              publishedAt: r.publishedAt,
              createdAt: r.createdAt,
              updatedAt: r.updatedAt,
            })),
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages,
            hasNext: pagination.page < totalPages,
            hasPrevious: pagination.page > 1,
          };
        }),

      publishReview: this.trpc.authedProcedure
        .input(z.object({ reviewId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          await this.prisma.productReview.updateMany({
            where: { id: input.reviewId, tenantId: ctx.tenantId },
            data: { isPublished: true, publishedAt: new Date(), updatedBy: ctx.userId },
          });
          return { success: true };
        }),

      unpublishReview: this.trpc.authedProcedure
        .input(z.object({ reviewId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          await this.prisma.productReview.updateMany({
            where: { id: input.reviewId, tenantId: ctx.tenantId },
            data: { isPublished: false, publishedAt: null, updatedBy: ctx.userId },
          });
          return { success: true };
        }),
    });
  }
}
