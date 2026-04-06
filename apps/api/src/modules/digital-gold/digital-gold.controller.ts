// ─── Digital Gold REST Controller ──────────────────────────────
// B2C facing API endpoints under /api/v1/store/digital-gold/*
// All endpoints require authenticated customer context.

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DigitalGoldService } from './digital-gold.service';
import { DigitalGoldSipService } from './digital-gold.sip.service';
import { DigitalGoldRedemptionService } from './digital-gold.redemption.service';
import { DigitalGoldAlertService } from './digital-gold.alert.service';
import { IndiaRatesService } from '../india/india.rates.service';
import type { ApiResponse } from '@caratflow/shared-types';
import type {
  BuyGoldInput,
  BuyGoldResponse,
  SellGoldInput,
  SellGoldResponse,
  GoldVaultResponse,
  GoldPortfolioResponse,
  GoldTransactionResponse,
  GoldTransactionListInput,
  CreateSipInput,
  SipResponse,
  SipExecutionResponse,
  RedeemGoldInput,
  RedeemGoldResponse,
  GoldPriceAlertInput,
  GoldPriceAlertResponse,
  DigitalGoldDashboardResponse,
} from '@caratflow/shared-types';

/** Request with tenant and customer context (set by auth middleware) */
interface AuthenticatedRequest {
  tenantId: string;
  customerId: string;
}

function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

@Controller('api/v1/store/digital-gold')
export class DigitalGoldController {
  constructor(
    private readonly digitalGoldService: DigitalGoldService,
    private readonly sipService: DigitalGoldSipService,
    private readonly redemptionService: DigitalGoldRedemptionService,
    private readonly alertService: DigitalGoldAlertService,
    private readonly ratesService: IndiaRatesService,
  ) {}

  // ─── Buy / Sell ─────────────────────────────────────────────

  @Post('buy')
  @HttpCode(HttpStatus.OK)
  async buyGold(
    @Req() req: AuthenticatedRequest,
    @Body() input: BuyGoldInput,
  ): Promise<ApiResponse<BuyGoldResponse>> {
    const result = await this.digitalGoldService.buyGold(
      req.tenantId,
      req.customerId,
      input,
    );
    return success(result);
  }

  @Post('sell')
  @HttpCode(HttpStatus.OK)
  async sellGold(
    @Req() req: AuthenticatedRequest,
    @Body() input: SellGoldInput,
  ): Promise<ApiResponse<SellGoldResponse>> {
    const result = await this.digitalGoldService.sellGold(
      req.tenantId,
      req.customerId,
      input,
    );
    return success(result);
  }

  // ─── Vault / Portfolio ──────────────────────────────────────

  @Get('vault')
  async getVault(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<GoldVaultResponse>> {
    const result = await this.digitalGoldService.getVault(
      req.tenantId,
      req.customerId,
    );
    return success(result);
  }

  @Get('portfolio')
  async getPortfolio(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<GoldPortfolioResponse>> {
    const result = await this.digitalGoldService.getPortfolio(
      req.tenantId,
      req.customerId,
    );
    return success(result);
  }

  // ─── Transactions ───────────────────────────────────────────

  @Get('transactions')
  async getTransactions(
    @Req() req: AuthenticatedRequest,
    @Query() query: GoldTransactionListInput,
  ): Promise<ApiResponse<GoldTransactionResponse[]>> {
    const result = await this.digitalGoldService.getTransactionHistory(
      req.tenantId,
      req.customerId,
      {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        sortOrder: query.sortOrder ?? 'desc',
        transactionType: query.transactionType,
        status: query.status,
        dateRange: query.dateRange,
      },
    );
    return { success: true, data: result.items, meta: { total: result.total, page: result.page, totalPages: result.totalPages } };
  }

  // ─── SIP ────────────────────────────────────────────────────

  @Post('sip')
  async createSip(
    @Req() req: AuthenticatedRequest,
    @Body() input: CreateSipInput,
  ): Promise<ApiResponse<SipResponse>> {
    const result = await this.sipService.createSip(
      req.tenantId,
      req.customerId,
      input,
    );
    return success(result);
  }

  @Get('sip')
  async getSips(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<SipResponse[]>> {
    const result = await this.sipService.getCustomerSips(
      req.tenantId,
      req.customerId,
    );
    return success(result);
  }

  @Get('sip/:sipId')
  async getSipDetail(
    @Req() req: AuthenticatedRequest,
    @Param('sipId') sipId: string,
  ): Promise<ApiResponse<SipResponse>> {
    const result = await this.sipService.getSip(req.tenantId, sipId);
    return success(result);
  }

  @Put('sip/:sipId/pause')
  async pauseSip(
    @Req() req: AuthenticatedRequest,
    @Param('sipId') sipId: string,
  ): Promise<ApiResponse<SipResponse>> {
    const result = await this.sipService.pauseSip(req.tenantId, sipId);
    return success(result);
  }

  @Put('sip/:sipId/resume')
  async resumeSip(
    @Req() req: AuthenticatedRequest,
    @Param('sipId') sipId: string,
  ): Promise<ApiResponse<SipResponse>> {
    const result = await this.sipService.resumeSip(req.tenantId, sipId);
    return success(result);
  }

  @Put('sip/:sipId/cancel')
  async cancelSip(
    @Req() req: AuthenticatedRequest,
    @Param('sipId') sipId: string,
  ): Promise<ApiResponse<SipResponse>> {
    const result = await this.sipService.cancelSip(req.tenantId, sipId);
    return success(result);
  }

  @Get('sip/:sipId/history')
  async getSipHistory(
    @Req() req: AuthenticatedRequest,
    @Param('sipId') sipId: string,
  ): Promise<ApiResponse<SipExecutionResponse[]>> {
    const result = await this.sipService.getSipHistory(req.tenantId, sipId);
    return success(result);
  }

  // ─── Redemption ─────────────────────────────────────────────

  @Post('redeem')
  async redeemGold(
    @Req() req: AuthenticatedRequest,
    @Body() input: RedeemGoldInput,
  ): Promise<ApiResponse<RedeemGoldResponse>> {
    let result: RedeemGoldResponse;

    switch (input.redemptionType) {
      case 'PHYSICAL_GOLD':
        result = await this.redemptionService.redeemForPhysical(
          req.tenantId,
          req.customerId,
          input.weightMg!,
          input.addressId,
        );
        break;
      case 'JEWELRY':
        result = await this.redemptionService.redeemForJewelry(
          req.tenantId,
          req.customerId,
          input.productId!,
          input.addressId,
        );
        break;
      case 'SELL_BACK':
        result = await this.redemptionService.sellBack(
          req.tenantId,
          req.customerId,
          input.weightMg!,
          input.addressId,
        );
        break;
      default:
        throw new Error('Invalid redemption type');
    }

    return success(result);
  }

  @Get('redemptions')
  async getRedemptions(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<RedeemGoldResponse[]>> {
    const result = await this.redemptionService.getRedemptions(
      req.tenantId,
      req.customerId,
    );
    return success(result);
  }

  // ─── Price Alerts ───────────────────────────────────────────

  @Post('alerts')
  async createAlert(
    @Req() req: AuthenticatedRequest,
    @Body() input: GoldPriceAlertInput,
  ): Promise<ApiResponse<GoldPriceAlertResponse>> {
    const result = await this.alertService.createAlert(
      req.tenantId,
      req.customerId,
      input,
    );
    return success(result);
  }

  @Get('alerts')
  async getAlerts(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<GoldPriceAlertResponse[]>> {
    const result = await this.alertService.getCustomerAlerts(
      req.tenantId,
      req.customerId,
    );
    return success(result);
  }

  @Delete('alerts/:alertId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelAlert(
    @Req() req: AuthenticatedRequest,
    @Param('alertId') alertId: string,
  ): Promise<void> {
    await this.alertService.cancelAlert(
      req.tenantId,
      req.customerId,
      alertId,
    );
  }

  // ─── Rates ──────────────────────────────────────────────────

  @Get('rates/current')
  async getCurrentRates(): Promise<ApiResponse<unknown>> {
    const result = await this.digitalGoldService.getCurrentRates();
    return success(result);
  }

  @Get('rates/history')
  async getRateHistory(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ApiResponse<unknown>> {
    const query = {
      metalType: 'GOLD',
      purity: 999,
      dateRange: from && to ? { from: new Date(from), to: new Date(to) } : undefined,
    };
    const result = await this.ratesService.getHistoricalRates(query);
    return success(result);
  }

  // ─── Dashboard (admin) ──────────────────────────────────────

  @Get('dashboard')
  async getDashboard(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<DigitalGoldDashboardResponse>> {
    const result = await this.digitalGoldService.getDashboard(req.tenantId);
    return success(result);
  }
}
