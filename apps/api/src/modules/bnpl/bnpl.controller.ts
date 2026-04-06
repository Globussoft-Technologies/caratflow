// ─── BNPL REST Controller ─────────────────────────────────────
// REST API endpoints for storefront-facing BNPL, EMI, and
// saved payment method operations.

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { BnplService } from './bnpl.service';
import { BnplEmiService } from './bnpl.emi.service';
import { BnplSavedPaymentService } from './bnpl.saved-payment.service';
import type {
  InitiateBnplInput,
  SavedPaymentMethodInput,
  EmiCalculatorInput,
} from '@caratflow/shared-types';

interface AuthenticatedRequest {
  tenantId: string;
  userId: string;
  customerId?: string;
}

@Controller('api/v1/store/payments')
export class BnplController {
  constructor(
    private readonly bnplService: BnplService,
    private readonly emiService: BnplEmiService,
    private readonly savedPaymentService: BnplSavedPaymentService,
  ) {}

  // ─── EMI Plans ────────────────────────────────────────────────

  /**
   * GET /api/v1/store/payments/emi-plans?amount=50000
   * List available EMI plans for a given amount (in paise).
   */
  @Get('emi-plans')
  async getEmiPlans(
    @Req() req: AuthenticatedRequest,
    @Query('amount') amountStr: string,
  ) {
    const amountPaise = parseInt(amountStr, 10);
    if (isNaN(amountPaise) || amountPaise <= 0) {
      throw new BadRequestException('amount query parameter must be a positive integer (in paise)');
    }

    const plans = await this.emiService.getAvailablePlans(req.tenantId, amountPaise);

    // Enrich each plan with EMI calculation
    const enrichedPlans = plans.map((plan) => {
      const calc = this.emiService.calculateEmi(amountPaise, plan.tenure, plan.interestRatePct);
      return {
        ...plan,
        monthlyEmiPaise: calc.monthlyEmiPaise,
        totalInterestPaise: calc.totalInterestPaise,
        totalPayablePaise: calc.totalPayablePaise,
      };
    });

    return {
      success: true,
      data: enrichedPlans,
      meta: { amountPaise, planCount: enrichedPlans.length },
    };
  }

  // ─── EMI Calculator ───────────────────────────────────────────

  /**
   * POST /api/v1/store/payments/emi/calculate
   * Calculate EMI for a given amount, tenure, and interest rate.
   */
  @Post('emi/calculate')
  @HttpCode(HttpStatus.OK)
  async calculateEmi(
    @Body() input: EmiCalculatorInput,
  ) {
    if (!input.amountPaise || input.amountPaise <= 0) {
      throw new BadRequestException('amountPaise must be a positive integer');
    }
    if (!input.tenure || input.tenure <= 0) {
      throw new BadRequestException('tenure must be a positive integer');
    }
    if (input.interestRatePct === undefined || input.interestRatePct < 0) {
      throw new BadRequestException('interestRatePct must be a non-negative integer');
    }

    const result = this.emiService.calculateEmiWithSchedule(
      input.amountPaise,
      input.tenure,
      input.interestRatePct,
    );

    return {
      success: true,
      data: result,
    };
  }

  // ─── BNPL Initiate ────────────────────────────────────────────

  /**
   * POST /api/v1/store/payments/bnpl/initiate
   * Initiate a BNPL transaction for an order.
   */
  @Post('bnpl/initiate')
  async initiateBnpl(
    @Req() req: AuthenticatedRequest,
    @Body() input: InitiateBnplInput,
  ) {
    if (!req.customerId) {
      throw new BadRequestException('Customer authentication required for BNPL');
    }

    const transaction = await this.bnplService.initiateBnpl(
      req.tenantId,
      req.userId,
      req.customerId,
      input,
    );

    return {
      success: true,
      data: transaction,
    };
  }

  // ─── BNPL Callback ────────────────────────────────────────────

  /**
   * POST /api/v1/store/payments/bnpl/callback/:provider
   * Handle BNPL provider webhook/callback.
   */
  @Post('bnpl/callback/:provider')
  @HttpCode(HttpStatus.OK)
  async handleBnplCallback(
    @Req() req: AuthenticatedRequest,
    @Param('provider') provider: string,
    @Body() payload: Record<string, unknown>,
  ) {
    const transaction = await this.bnplService.handleBnplCallback(
      req.tenantId,
      provider,
      payload,
    );

    return {
      success: true,
      data: transaction,
    };
  }

  // ─── BNPL Transaction ─────────────────────────────────────────

  /**
   * GET /api/v1/store/payments/bnpl/:transactionId
   * Get a BNPL transaction with its EMI schedule.
   */
  @Get('bnpl/:transactionId')
  async getTransaction(
    @Req() req: AuthenticatedRequest,
    @Param('transactionId') transactionId: string,
  ) {
    const transaction = await this.bnplService.getTransaction(req.tenantId, transactionId);

    return {
      success: true,
      data: transaction,
    };
  }

  // ─── Eligibility Check ────────────────────────────────────────

  /**
   * GET /api/v1/store/payments/bnpl/eligibility?customerId=xxx&amount=50000
   * Check BNPL eligibility for a customer and amount.
   */
  @Get('bnpl/eligibility')
  async checkEligibility(
    @Req() req: AuthenticatedRequest,
    @Query('customerId') customerId: string,
    @Query('amount') amountStr: string,
  ) {
    if (!customerId) {
      throw new BadRequestException('customerId query parameter is required');
    }
    const amountPaise = parseInt(amountStr, 10);
    if (isNaN(amountPaise) || amountPaise <= 0) {
      throw new BadRequestException('amount query parameter must be a positive integer (in paise)');
    }

    const result = await this.bnplService.checkEligibility(req.tenantId, customerId, amountPaise);

    return {
      success: true,
      data: result,
    };
  }

  // ─── Saved Payment Methods ────────────────────────────────────

  /**
   * GET /api/v1/store/payments/saved-methods
   * List saved payment methods for the current customer.
   */
  @Get('saved-methods')
  async listSavedMethods(
    @Req() req: AuthenticatedRequest,
  ) {
    if (!req.customerId) {
      throw new BadRequestException('Customer authentication required');
    }

    const methods = await this.savedPaymentService.listMethods(req.tenantId, req.customerId);

    return {
      success: true,
      data: methods,
    };
  }

  /**
   * POST /api/v1/store/payments/saved-methods
   * Save a new payment method (tokenized).
   */
  @Post('saved-methods')
  async saveMethod(
    @Req() req: AuthenticatedRequest,
    @Body() input: SavedPaymentMethodInput,
  ) {
    if (!req.customerId) {
      throw new BadRequestException('Customer authentication required');
    }

    const method = await this.savedPaymentService.saveMethod(
      req.tenantId,
      req.customerId,
      input,
    );

    return {
      success: true,
      data: method,
    };
  }

  /**
   * POST /api/v1/store/payments/saved-methods/:methodId/default
   * Set a saved payment method as default.
   */
  @Post('saved-methods/:methodId/default')
  @HttpCode(HttpStatus.OK)
  async setDefaultMethod(
    @Req() req: AuthenticatedRequest,
    @Param('methodId') methodId: string,
  ) {
    if (!req.customerId) {
      throw new BadRequestException('Customer authentication required');
    }

    const method = await this.savedPaymentService.setDefault(
      req.tenantId,
      req.customerId,
      methodId,
    );

    return {
      success: true,
      data: method,
    };
  }

  /**
   * DELETE /api/v1/store/payments/saved-methods/:methodId
   * Remove a saved payment method.
   */
  @Delete('saved-methods/:methodId')
  async removeMethod(
    @Req() req: AuthenticatedRequest,
    @Param('methodId') methodId: string,
  ) {
    if (!req.customerId) {
      throw new BadRequestException('Customer authentication required');
    }

    await this.savedPaymentService.removeMethod(req.tenantId, req.customerId, methodId);

    return {
      success: true,
      data: null,
    };
  }
}
