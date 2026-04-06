// ─── Customer Portal Controller ───────────────────────────────
// REST API for B2C "My Account" section. All endpoints require
// B2C customer JWT authentication via B2CAuthGuard.

import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { B2CAuthGuard } from '../../auth/b2c-auth.guard';
import { CustomerPortalProfileService } from './customer-portal.profile.service';
import { CustomerPortalOrdersService } from './customer-portal.orders.service';
import { CustomerPortalLoyaltyService } from './customer-portal.loyalty.service';
import { CustomerPortalSchemesService } from './customer-portal.schemes.service';
import { CustomerPortalKycService } from './customer-portal.kyc.service';
import { CustomerPortalDashboardService } from './customer-portal.dashboard.service';
import type { ApiResponse } from '@caratflow/shared-types';

// ─── DTO Classes ──────────────────────────────────────────────────

class UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  dateOfBirth?: Date;
  anniversary?: Date;
  preferences?: Record<string, unknown>;
}

class ChangePasswordDto {
  currentPassword!: string;
  newPassword!: string;
}

class NotificationPreferencesDto {
  orders?: { email?: boolean; sms?: boolean; whatsapp?: boolean; push?: boolean };
  promotions?: { email?: boolean; sms?: boolean; whatsapp?: boolean; push?: boolean };
  schemes?: { email?: boolean; sms?: boolean; whatsapp?: boolean; push?: boolean };
  loyalty?: { email?: boolean; sms?: boolean; whatsapp?: boolean; push?: boolean };
  reminders?: { email?: boolean; sms?: boolean; whatsapp?: boolean; push?: boolean };
}

class OrderListQueryDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

class ReturnRequestDto {
  orderId!: string;
  items!: Array<{ orderItemId: string; quantity: number; reason: string }>;
  reason!: string;
  preferredRefundMethod!: 'ORIGINAL_PAYMENT' | 'STORE_CREDIT' | 'BANK_TRANSFER';
}

class RedeemPointsDto {
  points!: number;
  orderId!: string;
}

class PayInstallmentDto {
  paymentMethod!: 'UPI' | 'BANK_TRANSFER' | 'CARD';
}

class EnrollSchemeDto {
  schemeId!: string;
  schemeType!: 'KITTY' | 'GOLD_SAVINGS';
}

class KycUploadDto {
  documentType!: string;
  documentNumber!: string;
  fileUrl!: string;
}

// ─── Helper ───────────────────────────────────────────────────────

function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

// ─── Controller ───────────────────────────────────────────────────

@ApiTags('Customer Portal')
@ApiBearerAuth()
@UseGuards(B2CAuthGuard)
@Controller('api/v1/store/account')
export class CustomerPortalController {
  constructor(
    private readonly profileService: CustomerPortalProfileService,
    private readonly ordersService: CustomerPortalOrdersService,
    private readonly loyaltyService: CustomerPortalLoyaltyService,
    private readonly schemesService: CustomerPortalSchemesService,
    private readonly kycService: CustomerPortalKycService,
    private readonly dashboardService: CustomerPortalDashboardService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  //  DASHBOARD
  // ═══════════════════════════════════════════════════════════════

  @Get('dashboard')
  @ApiOperation({ summary: 'Get customer dashboard' })
  async getDashboard(@Req() req: Request) {
    const data = await this.dashboardService.getDashboard(
      req.b2cTenantId!,
      req.customerId!,
    );
    return success(data);
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROFILE
  // ═══════════════════════════════════════════════════════════════

  @Get('profile')
  @ApiOperation({ summary: 'Get customer profile' })
  async getProfile(@Req() req: Request) {
    const data = await this.profileService.getProfile(
      req.b2cTenantId!,
      req.customerId!,
    );
    return success(data);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update customer profile' })
  async updateProfile(@Req() req: Request, @Body() body: UpdateProfileDto) {
    const data = await this.profileService.updateProfile(
      req.b2cTenantId!,
      req.customerId!,
      body,
    );
    return success(data);
  }

  @Put('password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  async changePassword(@Req() req: Request, @Body() body: ChangePasswordDto) {
    await this.profileService.changePassword(
      req.b2cTenantId!,
      req.customerId!,
      body,
    );
    return success({ message: 'Password changed successfully' });
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getNotificationPreferences(@Req() req: Request) {
    const data = await this.profileService.getNotificationPreferences(
      req.b2cTenantId!,
      req.customerId!,
    );
    return success(data);
  }

  @Put('notifications')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updateNotificationPreferences(
    @Req() req: Request,
    @Body() body: NotificationPreferencesDto,
  ) {
    const data = await this.profileService.updateNotificationPreferences(
      req.b2cTenantId!,
      req.customerId!,
      body,
    );
    return success(data);
  }

  @Delete('')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete account (soft delete)' })
  async deleteAccount(@Req() req: Request) {
    const data = await this.profileService.deleteAccount(
      req.b2cTenantId!,
      req.customerId!,
    );
    return success(data);
  }

  // ═══════════════════════════════════════════════════════════════
  //  ORDERS
  // ═══════════════════════════════════════════════════════════════

  @Get('orders')
  @ApiOperation({ summary: 'List my orders' })
  async getMyOrders(@Req() req: Request, @Query() query: OrderListQueryDto) {
    const data = await this.ordersService.getMyOrders(
      req.b2cTenantId!,
      req.customerId!,
      {
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        status: query.status as unknown as undefined,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      },
    );
    return success(data);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order detail' })
  async getOrderDetail(@Req() req: Request, @Param('id') orderId: string) {
    const data = await this.ordersService.getOrderDetail(
      req.b2cTenantId!,
      req.customerId!,
      orderId,
    );
    return success(data);
  }

  @Get('orders/:id/tracking')
  @ApiOperation({ summary: 'Get live order tracking' })
  async getOrderTracking(@Req() req: Request, @Param('id') orderId: string) {
    const data = await this.ordersService.getOrderTrackingLive(
      req.b2cTenantId!,
      req.customerId!,
      orderId,
    );
    return success(data);
  }

  @Get('orders/:id/invoice')
  @ApiOperation({ summary: 'Download order invoice' })
  async downloadInvoice(@Req() req: Request, @Param('id') orderId: string) {
    const data = await this.ordersService.downloadInvoice(
      req.b2cTenantId!,
      req.customerId!,
      orderId,
    );
    return success(data);
  }

  @Post('orders/:id/return')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a return' })
  async requestReturn(
    @Req() req: Request,
    @Param('id') orderId: string,
    @Body() body: ReturnRequestDto,
  ) {
    const data = await this.ordersService.requestReturn(
      req.b2cTenantId!,
      req.customerId!,
      { ...body, orderId },
    );
    return success(data);
  }

  @Post('orders/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order' })
  async cancelOrder(@Req() req: Request, @Param('id') orderId: string) {
    const data = await this.ordersService.cancelOrder(
      req.b2cTenantId!,
      req.customerId!,
      orderId,
    );
    return success(data);
  }

  // ═══════════════════════════════════════════════════════════════
  //  LOYALTY
  // ═══════════════════════════════════════════════════════════════

  @Get('loyalty')
  @ApiOperation({ summary: 'Get loyalty dashboard' })
  async getLoyaltyDashboard(@Req() req: Request) {
    const data = await this.loyaltyService.getLoyaltyDashboard(
      req.b2cTenantId!,
      req.customerId!,
    );
    return success(data);
  }

  @Get('loyalty/history')
  @ApiOperation({ summary: 'Get loyalty points history' })
  async getPointsHistory(@Req() req: Request, @Query() query: { page?: number; limit?: number }) {
    const data = await this.loyaltyService.getPointsHistory(
      req.b2cTenantId!,
      req.customerId!,
      { page: query.page ? Number(query.page) : undefined, limit: query.limit ? Number(query.limit) : undefined },
    );
    return success(data);
  }

  @Post('loyalty/redeem')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redeem loyalty points' })
  async redeemPoints(@Req() req: Request, @Body() body: RedeemPointsDto) {
    const data = await this.loyaltyService.redeemPoints(
      req.b2cTenantId!,
      req.customerId!,
      body.points,
      body.orderId,
    );
    return success(data);
  }

  // ═══════════════════════════════════════════════════════════════
  //  SCHEMES
  // ═══════════════════════════════════════════════════════════════

  @Get('schemes')
  @ApiOperation({ summary: 'Get my schemes' })
  async getMySchemes(@Req() req: Request) {
    const data = await this.schemesService.getMySchemes(
      req.b2cTenantId!,
      req.customerId!,
    );
    return success(data);
  }

  @Get('schemes/:id')
  @ApiOperation({ summary: 'Get scheme detail' })
  async getSchemeDetail(@Req() req: Request, @Param('id') membershipId: string) {
    const data = await this.schemesService.getSchemeDetail(
      req.b2cTenantId!,
      req.customerId!,
      membershipId,
    );
    return success(data);
  }

  @Post('schemes/:id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pay scheme installment' })
  async payInstallment(
    @Req() req: Request,
    @Param('id') membershipId: string,
    @Body() body: PayInstallmentDto,
  ) {
    const data = await this.schemesService.payInstallment(
      req.b2cTenantId!,
      req.customerId!,
      membershipId,
      body.paymentMethod,
    );
    return success(data);
  }

  @Post('schemes/enroll')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enroll in a scheme' })
  async enrollInScheme(@Req() req: Request, @Body() body: EnrollSchemeDto) {
    const data = await this.schemesService.enrollInScheme(
      req.b2cTenantId!,
      req.customerId!,
      body,
    );
    return success(data);
  }

  // ═══════════════════════════════════════════════════════════════
  //  KYC
  // ═══════════════════════════════════════════════════════════════

  @Get('kyc')
  @ApiOperation({ summary: 'Get KYC status' })
  async getKycStatus(@Req() req: Request) {
    const data = await this.kycService.getKycStatus(
      req.b2cTenantId!,
      req.customerId!,
    );
    return success(data);
  }

  @Post('kyc/upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload KYC document' })
  async uploadKycDocument(@Req() req: Request, @Body() body: KycUploadDto) {
    const data = await this.kycService.uploadDocument(
      req.b2cTenantId!,
      req.customerId!,
      body,
    );
    return success(data);
  }
}
