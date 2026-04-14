// ─── Customer Portal tRPC Router ───────────────────────────────
// Internal tRPC procedures mirroring the B2C "My Account" REST API.
// The authenticated user id (ctx.userId) is treated as the customer id.

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { CustomerPortalProfileService } from './customer-portal.profile.service';
import { CustomerPortalOrdersService } from './customer-portal.orders.service';
import { CustomerPortalLoyaltyService } from './customer-portal.loyalty.service';
import { CustomerPortalSchemesService } from './customer-portal.schemes.service';
import { CustomerPortalKycService } from './customer-portal.kyc.service';
import { CustomerPortalDashboardService } from './customer-portal.dashboard.service';
import {
  UpdateProfileInputSchema,
  ChangePasswordInputSchema,
  NotificationPreferencesInputSchema,
  OrderListInputSchema,
  ReturnRequestInputSchema,
  RedeemPointsInputSchema,
  PayInstallmentInputSchema,
  EnrollSchemeInputSchema,
  KycUploadInputSchema,
  PaginationSchema,
} from '@caratflow/shared-types';

@Injectable()
export class CustomerPortalTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly profileService: CustomerPortalProfileService,
    private readonly ordersService: CustomerPortalOrdersService,
    private readonly loyaltyService: CustomerPortalLoyaltyService,
    private readonly schemesService: CustomerPortalSchemesService,
    private readonly kycService: CustomerPortalKycService,
    private readonly dashboardService: CustomerPortalDashboardService,
  ) {}

  get router() {
    const authed = this.trpc.authedProcedure;

    return this.trpc.router({
      // ─── Dashboard ───────────────────────────────────────
      dashboard: authed.query(({ ctx }) =>
        this.dashboardService.getDashboard(ctx.tenantId, ctx.userId),
      ),

      // ─── Profile ─────────────────────────────────────────
      profile: this.trpc.router({
        get: authed.query(({ ctx }) =>
          this.profileService.getProfile(ctx.tenantId, ctx.userId),
        ),

        update: authed
          .input(UpdateProfileInputSchema)
          .mutation(({ ctx, input }) =>
            this.profileService.updateProfile(ctx.tenantId, ctx.userId, input),
          ),

        changePassword: authed
          .input(ChangePasswordInputSchema)
          .mutation(({ ctx, input }) =>
            this.profileService.changePassword(ctx.tenantId, ctx.userId, input),
          ),

        getNotificationPreferences: authed.query(({ ctx }) =>
          this.profileService.getNotificationPreferences(ctx.tenantId, ctx.userId),
        ),

        updateNotificationPreferences: authed
          .input(NotificationPreferencesInputSchema)
          .mutation(({ ctx, input }) =>
            this.profileService.updateNotificationPreferences(ctx.tenantId, ctx.userId, input),
          ),

        deleteAccount: authed.mutation(({ ctx }) =>
          this.profileService.deleteAccount(ctx.tenantId, ctx.userId),
        ),
      }),

      // ─── Orders ──────────────────────────────────────────
      orders: this.trpc.router({
        list: authed
          .input(OrderListInputSchema)
          .query(({ ctx, input }) =>
            this.ordersService.getMyOrders(ctx.tenantId, ctx.userId, input),
          ),

        get: authed
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.ordersService.getOrderDetail(ctx.tenantId, ctx.userId, input.id),
          ),

        tracking: authed
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.ordersService.getOrderTrackingLive(ctx.tenantId, ctx.userId, input.id),
          ),

        downloadInvoice: authed
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.ordersService.downloadInvoice(ctx.tenantId, ctx.userId, input.id),
          ),

        requestReturn: authed
          .input(ReturnRequestInputSchema)
          .mutation(({ ctx, input }) =>
            this.ordersService.requestReturn(ctx.tenantId, ctx.userId, input),
          ),

        cancel: authed
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.ordersService.cancelOrder(ctx.tenantId, ctx.userId, input.id),
          ),
      }),

      // ─── Loyalty ─────────────────────────────────────────
      loyalty: this.trpc.router({
        dashboard: authed.query(({ ctx }) =>
          this.loyaltyService.getLoyaltyDashboard(ctx.tenantId, ctx.userId),
        ),

        history: authed
          .input(PaginationSchema.optional())
          .query(({ ctx, input }) =>
            this.loyaltyService.getPointsHistory(ctx.tenantId, ctx.userId, input ?? {}),
          ),

        redeem: authed
          .input(RedeemPointsInputSchema)
          .mutation(({ ctx, input }) =>
            this.loyaltyService.redeemPoints(ctx.tenantId, ctx.userId, input.points, input.orderId),
          ),
      }),

      // ─── Schemes ─────────────────────────────────────────
      schemes: this.trpc.router({
        list: authed.query(({ ctx }) =>
          this.schemesService.getMySchemes(ctx.tenantId, ctx.userId),
        ),

        get: authed
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.schemesService.getSchemeDetail(ctx.tenantId, ctx.userId, input.id),
          ),

        payInstallment: authed
          .input(z.object({ membershipId: z.string().uuid() }).merge(PayInstallmentInputSchema))
          .mutation(({ ctx, input }) =>
            this.schemesService.payInstallment(
              ctx.tenantId, ctx.userId, input.membershipId, input.paymentMethod,
            ),
          ),

        enroll: authed
          .input(EnrollSchemeInputSchema)
          .mutation(({ ctx, input }) =>
            this.schemesService.enrollInScheme(ctx.tenantId, ctx.userId, input),
          ),
      }),

      // ─── KYC ─────────────────────────────────────────────
      kyc: this.trpc.router({
        status: authed.query(({ ctx }) =>
          this.kycService.getKycStatus(ctx.tenantId, ctx.userId),
        ),

        upload: authed
          .input(KycUploadInputSchema)
          .mutation(({ ctx, input }) =>
            this.kycService.uploadDocument(ctx.tenantId, ctx.userId, input),
          ),
      }),
    });
  }
}
