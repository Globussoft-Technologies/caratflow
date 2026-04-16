// ─── CRM REST Controller ──────────────────────────────────────
// Thin REST shim around the CRM tRPC procedures, exposed for the
// B2C storefront which fetches over plain `fetch()`. All endpoints
// require a B2C customer JWT via B2CAuthGuard so the customerId
// comes from the validated token (never from the request body).

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { B2CAuthGuard } from '../../auth/b2c-auth.guard';
import { VideoConsultationService } from './video-consultation.service';
import { CrmLeadService } from './crm.lead.service';
import type { ApiResponse } from '@caratflow/shared-types';

// ─── DTOs ─────────────────────────────────────────────────────

class VideoConsultationRequestDto {
  productsOfInterest?: Array<{ productId: string; notes?: string }>;
  preferredLang?: string;
  customerPhone?: string;
  notes?: string;
}

class NewsletterSubscribeDto {
  email!: string;
  source?: string;
  name?: string;
}

// ─── Helper ───────────────────────────────────────────────────

function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

// ─── Controller ───────────────────────────────────────────────

@ApiTags('CRM (B2C REST shim)')
@Controller('api/v1/crm')
export class CrmController {
  constructor(
    private readonly videoConsultationService: VideoConsultationService,
    private readonly leadService: CrmLeadService,
  ) {}

  // ─── Video Consultation ────────────────────────────────────

  @Post('video-consultation/request')
  @UseGuards(B2CAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request a video consultation (B2C storefront)' })
  async requestConsultation(
    @Req() req: Request,
    @Body() body: VideoConsultationRequestDto,
  ) {
    const tenantId = req.b2cTenantId!;
    const customerId = req.customerId!;
    const data = await this.videoConsultationService.request(tenantId, customerId, {
      customerId,
      productsOfInterest: body.productsOfInterest,
      preferredLang: body.preferredLang ?? 'en',
      customerPhone: body.customerPhone,
      notes: body.notes,
    });
    return success(data);
  }

  @Get('video-consultation/list')
  @UseGuards(B2CAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List the signed-in customer\'s video consultations' })
  async listConsultations(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const tenantId = req.b2cTenantId!;
    const customerId = req.customerId!;
    const data = await this.videoConsultationService.list(
      tenantId,
      {
        customerId,
        status: status as undefined,
      },
      {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      },
    );
    return success(data);
  }

  // ─── Newsletter (no auth required) ─────────────────────────

  @Post('newsletter/subscribe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subscribe an email to the newsletter (creates a lead)' })
  async subscribeNewsletter(
    @Req() req: Request,
    @Body() body: NewsletterSubscribeDto,
  ) {
    if (!body.email || !body.email.includes('@')) {
      return { success: false, error: { code: 'INVALID_EMAIL', message: 'Valid email is required' } } as ApiResponse<null>;
    }
    // Resolve tenantId either from the authenticated B2C session or fall back to header.
    const tenantId = req.b2cTenantId ?? (req.headers['x-tenant-id'] as string | undefined);
    if (!tenantId) {
      return { success: false, error: { code: 'MISSING_TENANT', message: 'Tenant context missing' } } as ApiResponse<null>;
    }
    const userId = req.customerId ?? 'system';
    const [firstName, ...rest] = (body.name ?? body.email.split('@')[0] ?? 'Newsletter').split(/\s+/);
    const lastName = rest.join(' ') || 'Subscriber';
    try {
      const lead = await this.leadService.createLead(tenantId, userId, {
        firstName: firstName || 'Newsletter',
        lastName,
        email: body.email,
        source: 'WEBSITE',
        notes: body.source ? `Newsletter signup via ${body.source}` : 'Newsletter signup',
      } as Parameters<typeof this.leadService.createLead>[2]);
      return success({ id: lead.id, subscribed: true });
    } catch (err) {
      // Tolerate duplicates / validation errors so the storefront never sees a 500.
      return success({ subscribed: true, note: err instanceof Error ? err.message : 'noted' });
    }
  }
}
