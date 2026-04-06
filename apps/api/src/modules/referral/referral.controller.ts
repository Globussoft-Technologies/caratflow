// ─── Referral REST Controller ──────────────────────────────────
// Store-facing REST endpoints for referral program.
// Prefix: /api/v1/store/referral

import { Controller, Get, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ReferralService } from './referral.service';

interface AuthenticatedRequest {
  tenantId: string;
  userId: string;
  customerId: string;
}

@Controller('api/v1/store/referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /** GET /api/v1/store/referral/my-code - Get or generate referral code for authenticated customer */
  @Get('my-code')
  async getMyCode(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.referralService.getReferralCode(req.tenantId, req.customerId),
    };
  }

  /** POST /api/v1/store/referral/apply - Apply a referral code */
  @Post('apply')
  @HttpCode(HttpStatus.OK)
  async applyReferral(
    @Req() req: AuthenticatedRequest,
    @Body() body: { referralCode: string; invitedVia?: 'WHATSAPP' | 'EMAIL' | 'SMS' | 'LINK' | 'SOCIAL' },
  ) {
    const referral = await this.referralService.applyReferral(
      req.tenantId,
      req.customerId,
      body.referralCode,
      body.invitedVia ?? 'LINK',
    );
    return {
      success: true,
      data: referral,
    };
  }

  /** GET /api/v1/store/referral/stats - Get referral stats for authenticated customer */
  @Get('stats')
  async getStats(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.referralService.getReferralStats(req.tenantId, req.customerId),
    };
  }
}
