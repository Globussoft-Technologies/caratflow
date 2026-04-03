// ─── Financial Tax Service ─────────────────────────────────────
// GST computation, TDS/TCS tracking, GSTR-1 / GSTR-3B generation.

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type { Prisma } from '@caratflow/db';
import type {
  GstComputationInput,
  GstComputationResult,
  TaxReportInput,
  Gstr1Data,
  Gstr3bData,
} from '@caratflow/shared-types';

@Injectable()
export class FinancialTaxService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── GST Computation ─────────────────────────────────────────

  computeGst(input: GstComputationInput): GstComputationResult {
    const { taxableAmountPaise, gstRate, sourceState, destState } = input;
    const isInterState = sourceState.toUpperCase() !== destState.toUpperCase();
    const ratePercent = gstRate / 100;

    let cgstPaise = 0;
    let sgstPaise = 0;
    let igstPaise = 0;
    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;

    if (isInterState) {
      igstRate = gstRate;
      igstPaise = Math.round((taxableAmountPaise * ratePercent) / 100);
    } else {
      const halfRate = ratePercent / 2;
      cgstRate = gstRate / 2;
      sgstRate = gstRate / 2;
      cgstPaise = Math.round((taxableAmountPaise * halfRate) / 100);
      sgstPaise = Math.round((taxableAmountPaise * halfRate) / 100);
    }

    return {
      taxableAmountPaise,
      cgstRate,
      sgstRate,
      igstRate,
      cgstPaise,
      sgstPaise,
      igstPaise,
      totalTaxPaise: cgstPaise + sgstPaise + igstPaise,
      isInterState,
    };
  }

  // ─── TDS Computation (Section 194Q) ───────────────────────────

  async computeTds(
    tenantId: string,
    supplierId: string,
    purchaseAmountPaise: number,
    financialYearStart: Date,
    financialYearEnd: Date,
    hasPan: boolean,
  ) {
    const THRESHOLD_PAISE = 5_000_000_00; // Rs. 50 lakh

    // Get cumulative purchase amount from this supplier in the FY
    const cumulativeResult = await this.prisma.invoice.aggregate({
      _sum: { totalPaise: true },
      where: {
        tenantId,
        supplierId,
        invoiceType: 'PURCHASE',
        status: { not: 'VOIDED' },
        createdAt: { gte: financialYearStart, lte: financialYearEnd },
      },
    });

    const cumulativePurchasePaise = Number(cumulativeResult._sum.totalPaise ?? 0);
    if (cumulativePurchasePaise + purchaseAmountPaise <= THRESHOLD_PAISE) {
      return { tdsAmountPaise: 0, isApplicable: false, cumulativePurchasePaise };
    }

    const rate = hasPan ? 0.1 : 5; // 0.1% with PAN, 5% without
    const tdsAmountPaise = Math.round((purchaseAmountPaise * rate) / 100);

    return { tdsAmountPaise, isApplicable: true, cumulativePurchasePaise };
  }

  // ─── TCS Computation (Section 206C) ───────────────────────────

  async computeTcs(
    tenantId: string,
    customerId: string,
    saleAmountPaise: number,
    financialYearStart: Date,
    financialYearEnd: Date,
    hasPan: boolean,
  ) {
    const THRESHOLD_PAISE = 5_000_000_00; // Rs. 50 lakh

    const cumulativeResult = await this.prisma.invoice.aggregate({
      _sum: { totalPaise: true },
      where: {
        tenantId,
        customerId,
        invoiceType: 'SALES',
        status: { not: 'VOIDED' },
        createdAt: { gte: financialYearStart, lte: financialYearEnd },
      },
    });

    const cumulativeSalePaise = Number(cumulativeResult._sum.totalPaise ?? 0);
    if (cumulativeSalePaise + saleAmountPaise <= THRESHOLD_PAISE) {
      return { tcsAmountPaise: 0, isApplicable: false, cumulativeSalePaise };
    }

    const rate = hasPan ? 0.1 : 1; // 0.1% with PAN, 1% without
    const tcsAmountPaise = Math.round((saleAmountPaise * rate) / 100);

    return { tcsAmountPaise, isApplicable: true, cumulativeSalePaise };
  }

  // ─── GSTR-1 Data Generation ───────────────────────────────────

  async generateGstr1Data(tenantId: string, input: TaxReportInput): Promise<Gstr1Data> {
    const { month, year } = input.period;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceType: 'SALES',
        status: { not: 'VOIDED' },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        customer: true,
        lineItems: true,
        taxTransactions: true,
      },
    });

    // B2B: Sales to registered dealers (with GSTIN)
    const b2bMap = new Map<string, Array<{
      invoiceNumber: string;
      invoiceDate: string;
      totalPaise: number;
      taxableAmountPaise: number;
      cgstPaise: number;
      sgstPaise: number;
      igstPaise: number;
    }>>();

    // B2C: Sales to unregistered buyers
    const b2c: Array<{
      invoiceNumber: string;
      invoiceDate: string;
      totalPaise: number;
      taxableAmountPaise: number;
      cgstPaise: number;
      sgstPaise: number;
      igstPaise: number;
    }> = [];

    // HSN summary
    const hsnMap = new Map<string, {
      description: string;
      quantity: number;
      taxableAmountPaise: number;
      cgstPaise: number;
      sgstPaise: number;
      igstPaise: number;
      cessPaise: number;
    }>();

    let totalTaxableAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    for (const invoice of invoices) {
      const taxableAmount = Number(invoice.subtotalPaise) - Number(invoice.discountPaise);
      const cgst = invoice.taxTransactions
        .filter((t) => t.taxType === 'CGST')
        .reduce((sum, t) => sum + Number(t.taxAmountPaise), 0);
      const sgst = invoice.taxTransactions
        .filter((t) => t.taxType === 'SGST')
        .reduce((sum, t) => sum + Number(t.taxAmountPaise), 0);
      const igst = invoice.taxTransactions
        .filter((t) => t.taxType === 'IGST')
        .reduce((sum, t) => sum + Number(t.taxAmountPaise), 0);

      totalTaxableAmount += taxableAmount;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;

      const invoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.createdAt.toISOString().split('T')[0]!,
        totalPaise: Number(invoice.totalPaise),
        taxableAmountPaise: taxableAmount,
        cgstPaise: cgst,
        sgstPaise: sgst,
        igstPaise: igst,
      };

      const gstin = invoice.customer?.gstinNumber;
      if (gstin) {
        if (!b2bMap.has(gstin)) b2bMap.set(gstin, []);
        b2bMap.get(gstin)!.push(invoiceData);
      } else {
        b2c.push(invoiceData);
      }

      // HSN summary
      for (const line of invoice.lineItems) {
        const hsn = line.hsnCode;
        const existing = hsnMap.get(hsn);
        if (existing) {
          existing.quantity += line.quantity;
          existing.taxableAmountPaise += Number(line.taxableAmountPaise);
          existing.cgstPaise += Number(line.cgstPaise);
          existing.sgstPaise += Number(line.sgstPaise);
          existing.igstPaise += Number(line.igstPaise);
        } else {
          hsnMap.set(hsn, {
            description: line.description,
            quantity: line.quantity,
            taxableAmountPaise: Number(line.taxableAmountPaise),
            cgstPaise: Number(line.cgstPaise),
            sgstPaise: Number(line.sgstPaise),
            igstPaise: Number(line.igstPaise),
            cessPaise: 0,
          });
        }
      }
    }

    const b2b = Array.from(b2bMap.entries()).map(([gstin, invs]) => ({
      gstin,
      invoices: invs,
    }));

    const hsnSummary = Array.from(hsnMap.entries()).map(([hsnCode, data]) => ({
      hsnCode,
      ...data,
      totalTaxPaise: data.cgstPaise + data.sgstPaise + data.igstPaise + data.cessPaise,
    }));

    return {
      period: `${month.toString().padStart(2, '0')}-${year}`,
      b2b,
      b2c,
      hsnSummary,
      totalTaxableAmount,
      totalCgst,
      totalSgst,
      totalIgst,
    };
  }

  // ─── GSTR-3B Data Generation ──────────────────────────────────

  async generateGstr3bData(tenantId: string, input: TaxReportInput): Promise<Gstr3bData> {
    const { month, year } = input.period;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Outward supplies (sales)
    const salesTax = await this.prisma.taxTransaction.groupBy({
      by: ['taxType'],
      _sum: { taxableAmountPaise: true, taxAmountPaise: true },
      where: {
        tenantId,
        invoice: { invoiceType: 'SALES', status: { not: 'VOIDED' }, createdAt: { gte: startDate, lte: endDate } },
      },
    });

    // Inward supplies (purchases)
    const purchaseTax = await this.prisma.taxTransaction.groupBy({
      by: ['taxType'],
      _sum: { taxableAmountPaise: true, taxAmountPaise: true },
      where: {
        tenantId,
        invoice: { invoiceType: 'PURCHASE', status: { not: 'VOIDED' }, createdAt: { gte: startDate, lte: endDate } },
      },
    });

    const getTaxAmount = (data: typeof salesTax, type: string): number =>
      Number(data.find((d) => d.taxType === type)?._sum.taxAmountPaise ?? 0);

    const getTaxableAmount = (data: typeof salesTax): number =>
      Number(data.reduce((sum, d) => sum + Number(d._sum.taxableAmountPaise ?? 0), 0));

    const outIgst = getTaxAmount(salesTax, 'IGST');
    const outCgst = getTaxAmount(salesTax, 'CGST');
    const outSgst = getTaxAmount(salesTax, 'SGST');

    const inIgst = getTaxAmount(purchaseTax, 'IGST');
    const inCgst = getTaxAmount(purchaseTax, 'CGST');
    const inSgst = getTaxAmount(purchaseTax, 'SGST');

    return {
      period: `${month.toString().padStart(2, '0')}-${year}`,
      outwardSupplies: {
        taxableAmountPaise: getTaxableAmount(salesTax),
        igstPaise: outIgst,
        cgstPaise: outCgst,
        sgstPaise: outSgst,
        cessPaise: 0,
      },
      inwardSupplies: {
        taxableAmountPaise: getTaxableAmount(purchaseTax),
        igstPaise: inIgst,
        cgstPaise: inCgst,
        sgstPaise: inSgst,
        cessPaise: 0,
      },
      itcAvailable: {
        igstPaise: inIgst,
        cgstPaise: inCgst,
        sgstPaise: inSgst,
        cessPaise: 0,
      },
      taxPayable: {
        igstPaise: Math.max(0, outIgst - inIgst),
        cgstPaise: Math.max(0, outCgst - inCgst),
        sgstPaise: Math.max(0, outSgst - inSgst),
        cessPaise: 0,
      },
    };
  }

  // ─── Tax Liability ────────────────────────────────────────────

  async getTaxLiability(tenantId: string, period: { month: number; year: number }) {
    const gstr3b = await this.generateGstr3bData(tenantId, { period });
    return {
      period: gstr3b.period,
      igstPayable: gstr3b.taxPayable.igstPaise,
      cgstPayable: gstr3b.taxPayable.cgstPaise,
      sgstPayable: gstr3b.taxPayable.sgstPaise,
      cessPayable: gstr3b.taxPayable.cessPaise,
      totalPayable:
        gstr3b.taxPayable.igstPaise +
        gstr3b.taxPayable.cgstPaise +
        gstr3b.taxPayable.sgstPaise +
        gstr3b.taxPayable.cessPaise,
    };
  }
}
