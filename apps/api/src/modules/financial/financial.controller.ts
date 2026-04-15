// ─── Financial REST Controller ────────────────────────────────
// Thin REST surface for things that don't fit tRPC: primarily
// binary PDF downloads. The rest of financial lives on tRPC.

import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FinancialService } from './financial.service';

interface AuthenticatedRequest extends Request {
  tenantId?: string;
  userId?: string;
}

function getTenantId(req: AuthenticatedRequest): string {
  const tenantId =
    req.tenantId ??
    (req.headers['x-tenant-id'] as string | undefined) ??
    undefined;
  if (!tenantId) throw new BadRequestException('Missing tenant context');
  return tenantId;
}

@Controller('api/v1/financial')
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  /**
   * GET /api/v1/financial/invoices/:id/pdf
   * Stream a generated invoice PDF as application/pdf.
   */
  @Get('invoices/:id/pdf')
  async downloadInvoicePdf(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const tenantId = getTenantId(req);
    const buf = await this.financialService.generateInvoicePdf(tenantId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="invoice-${id}.pdf"`,
    );
    res.setHeader('Content-Length', String(buf.length));
    res.end(buf);
  }
}
