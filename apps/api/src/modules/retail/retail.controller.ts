// ─── Retail REST Controller ───────────────────────────────────
// Thin REST surface for PDF receipt downloads. POS flows still use tRPC.

import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { RetailService } from './retail.service';

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

@Controller('api/v1/retail')
export class RetailController {
  constructor(private readonly retailService: RetailService) {}

  /**
   * GET /api/v1/retail/sales/:id/receipt.pdf
   * Stream a POS sale receipt as application/pdf.
   */
  @Get('sales/:id/receipt.pdf')
  async downloadReceipt(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const tenantId = getTenantId(req);
    const buf = await this.retailService.generateSaleReceipt(tenantId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="receipt-${id}.pdf"`,
    );
    res.setHeader('Content-Length', String(buf.length));
    res.end(buf);
  }
}
