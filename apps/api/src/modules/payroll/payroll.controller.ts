// ─── Payroll REST Controller ──────────────────────────────────
// Thin REST surface for binary payslip PDF downloads. The rest
// of payroll lives on tRPC.

import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PayrollPayslipService } from './payroll.payslip.service';

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

@Controller('api/v1/payroll')
export class PayrollController {
  constructor(private readonly payslipService: PayrollPayslipService) {}

  /**
   * GET /api/v1/payroll/payslips/:id/pdf
   * Stream a generated payslip PDF as application/pdf.
   */
  @Get('payslips/:id/pdf')
  async downloadPayslipPdf(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const tenantId = getTenantId(req);
    const buf = await this.payslipService.generatePdf(tenantId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="payslip-${id}.pdf"`,
    );
    res.setHeader('Content-Length', String(buf.length));
    res.end(buf);
  }
}
