// ─── Financial Service ─────────────────────────────────────────
// Core accounting operations: journal entries, invoices, payments.
// All money values in paise (BigInt). Double-entry must always balance.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { parsePagination, buildPaginatedResult } from '../../common/pagination.helper';
import type { Prisma } from '@caratflow/db';
import type {
  JournalEntryInput,
  JournalEntryListInput,
  InvoiceInput,
  InvoiceListInput,
  PaymentInput,
  PaymentListInput,
  GstComputationInput,
  GstComputationResult,
} from '@caratflow/shared-types';

@Injectable()
export class FinancialService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Number Generation ────────────────────────────────────────

  private async generateNumber(tenantId: string, prefix: string, model: 'journalEntry' | 'invoice' | 'payment'): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const base = `${prefix}-${year}${month}`;

    let count: number;
    if (model === 'journalEntry') {
      count = await this.prisma.journalEntry.count({
        where: { tenantId, entryNumber: { startsWith: base } },
      });
    } else if (model === 'invoice') {
      count = await this.prisma.invoice.count({
        where: { tenantId, invoiceNumber: { startsWith: base } },
      });
    } else {
      count = await this.prisma.payment.count({
        where: { tenantId, paymentNumber: { startsWith: base } },
      });
    }

    return `${base}-${String(count + 1).padStart(4, '0')}`;
  }

  // ─── GST Computation ─────────────────────────────────────────

  computeGst(input: GstComputationInput): GstComputationResult {
    const { taxableAmountPaise, gstRate, sourceState, destState } = input;
    const isInterState = sourceState.toUpperCase() !== destState.toUpperCase();
    const ratePercent = gstRate / 100; // e.g., 300 -> 3%

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

    const totalTaxPaise = cgstPaise + sgstPaise + igstPaise;

    return {
      taxableAmountPaise,
      cgstRate,
      sgstRate,
      igstRate,
      cgstPaise,
      sgstPaise,
      igstPaise,
      totalTaxPaise,
      isInterState,
    };
  }

  // ─── Journal Entries ──────────────────────────────────────────

  async createJournalEntry(tenantId: string, userId: string, input: JournalEntryInput) {
    // Validate debits == credits
    const totalDebit = input.lines.reduce((sum, l) => sum + l.debitPaise, 0);
    const totalCredit = input.lines.reduce((sum, l) => sum + l.creditPaise, 0);
    if (totalDebit !== totalCredit || totalDebit === 0) {
      throw new BadRequestException('Total debits must equal total credits and be greater than zero');
    }

    const entryNumber = await this.generateNumber(tenantId, 'JE', 'journalEntry');

    return this.prisma.journalEntry.create({
      data: {
        tenantId,
        entryNumber,
        date: input.date,
        description: input.description,
        reference: input.reference,
        status: 'DRAFT',
        createdBy: userId,
        updatedBy: userId,
        lines: {
          create: input.lines.map((line) => ({
            tenantId,
            accountId: line.accountId,
            debitPaise: BigInt(line.debitPaise),
            creditPaise: BigInt(line.creditPaise),
            description: line.description,
            currencyCode: line.currencyCode ?? 'INR',
            exchangeRate: line.exchangeRate ?? 10000,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });
  }

  async postJournalEntry(tenantId: string, userId: string, id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: this.tenantWhere(tenantId, { id }) as Prisma.JournalEntryWhereInput,
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    if (entry.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT entries can be posted');
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: 'POSTED', postedAt: new Date(), updatedBy: userId },
      include: { lines: { include: { account: true } } },
    });
  }

  async voidJournalEntry(tenantId: string, userId: string, id: string, reason: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: this.tenantWhere(tenantId, { id }) as Prisma.JournalEntryWhereInput,
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    if (entry.status === 'VOIDED') {
      throw new BadRequestException('Entry is already voided');
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: 'VOIDED', voidedAt: new Date(), voidReason: reason, updatedBy: userId },
      include: { lines: { include: { account: true } } },
    });
  }

  async getJournalEntry(tenantId: string, id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: this.tenantWhere(tenantId, { id }) as Prisma.JournalEntryWhereInput,
      include: { lines: { include: { account: true } } },
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    return entry;
  }

  async listJournalEntries(tenantId: string, input: JournalEntryListInput) {
    const { skip, take, orderBy, page, limit } = parsePagination(input);

    const where: Prisma.JournalEntryWhereInput = { tenantId };
    if (input.status) where.status = input.status;
    if (input.dateRange) {
      where.date = { gte: input.dateRange.from, lte: input.dateRange.to };
    }
    if (input.search) {
      where.OR = [
        { entryNumber: { contains: input.search } },
        { description: { contains: input.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { date: 'desc' },
        include: { lines: { include: { account: true } } },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  // ─── Invoices ─────────────────────────────────────────────────

  async createInvoice(tenantId: string, userId: string, input: InvoiceInput) {
    const prefix = input.invoiceType === 'SALES' ? 'INV' :
      input.invoiceType === 'PURCHASE' ? 'PINV' :
      input.invoiceType === 'CREDIT_NOTE' ? 'CN' : 'DN';

    const invoiceNumber = await this.generateNumber(tenantId, prefix, 'invoice');

    // Compute line items with tax
    let subtotalPaise = BigInt(0);
    let totalDiscountPaise = BigInt(0);
    let totalTaxPaise = BigInt(0);

    const lineItemsData = input.lineItems.map((line) => {
      const lineTotal = BigInt(line.unitPricePaise) * BigInt(line.quantity);
      const discountPaise = BigInt(line.discountPaise ?? 0);
      const taxableAmountPaise = lineTotal - discountPaise;

      const gst = this.computeGst({
        taxableAmountPaise: Number(taxableAmountPaise),
        hsnCode: line.hsnCode ?? '7113',
        gstRate: line.gstRate ?? 300,
        sourceState: input.sourceState,
        destState: input.destState,
      });

      const lineTotalWithTax = taxableAmountPaise + BigInt(gst.totalTaxPaise);
      subtotalPaise += lineTotal;
      totalDiscountPaise += discountPaise;
      totalTaxPaise += BigInt(gst.totalTaxPaise);

      return {
        tenantId,
        productId: line.productId ?? null,
        description: line.description,
        quantity: line.quantity,
        unitPricePaise: BigInt(line.unitPricePaise),
        discountPaise,
        taxableAmountPaise,
        hsnCode: line.hsnCode ?? '7113',
        gstRate: line.gstRate ?? 300,
        cgstPaise: BigInt(gst.cgstPaise),
        sgstPaise: BigInt(gst.sgstPaise),
        igstPaise: BigInt(gst.igstPaise),
        totalPaise: lineTotalWithTax,
      };
    });

    const totalPaise = subtotalPaise - totalDiscountPaise + totalTaxPaise;

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        invoiceNumber,
        invoiceType: input.invoiceType,
        customerId: input.customerId ?? null,
        supplierId: input.supplierId ?? null,
        locationId: input.locationId,
        status: 'DRAFT',
        subtotalPaise,
        discountPaise: totalDiscountPaise,
        taxPaise: totalTaxPaise,
        totalPaise,
        currencyCode: input.currencyCode ?? 'INR',
        dueDate: input.dueDate ?? null,
        notes: input.notes ?? null,
        terms: input.terms ?? null,
        createdBy: userId,
        updatedBy: userId,
        lineItems: { create: lineItemsData },
      },
      include: {
        lineItems: true,
        customer: true,
        supplier: true,
      },
    });

    // Create tax transactions
    for (const line of lineItemsData) {
      const taxTransactions: Array<{
        tenantId: string;
        invoiceId: string;
        taxType: 'CGST' | 'SGST' | 'IGST';
        taxRate: number;
        taxableAmountPaise: bigint;
        taxAmountPaise: bigint;
        hsnCode: string;
        sourceState: string;
        destState: string;
        isReverseCharge: boolean;
      }> = [];

      if (line.cgstPaise > BigInt(0)) {
        taxTransactions.push({
          tenantId,
          invoiceId: invoice.id,
          taxType: 'CGST',
          taxRate: line.gstRate / 2,
          taxableAmountPaise: line.taxableAmountPaise,
          taxAmountPaise: line.cgstPaise,
          hsnCode: line.hsnCode,
          sourceState: input.sourceState,
          destState: input.destState,
          isReverseCharge: false,
        });
      }
      if (line.sgstPaise > BigInt(0)) {
        taxTransactions.push({
          tenantId,
          invoiceId: invoice.id,
          taxType: 'SGST',
          taxRate: line.gstRate / 2,
          taxableAmountPaise: line.taxableAmountPaise,
          taxAmountPaise: line.sgstPaise,
          hsnCode: line.hsnCode,
          sourceState: input.sourceState,
          destState: input.destState,
          isReverseCharge: false,
        });
      }
      if (line.igstPaise > BigInt(0)) {
        taxTransactions.push({
          tenantId,
          invoiceId: invoice.id,
          taxType: 'IGST',
          taxRate: line.gstRate,
          taxableAmountPaise: line.taxableAmountPaise,
          taxAmountPaise: line.igstPaise,
          hsnCode: line.hsnCode,
          sourceState: input.sourceState,
          destState: input.destState,
          isReverseCharge: false,
        });
      }

      if (taxTransactions.length > 0) {
        await this.prisma.taxTransaction.createMany({ data: taxTransactions });
      }
    }

    return invoice;
  }

  async updateInvoiceStatus(tenantId: string, userId: string, id: string, status: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: this.tenantWhere(tenantId, { id }) as Prisma.InvoiceWhereInput,
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    return this.prisma.invoice.update({
      where: { id },
      data: { status: status as 'DRAFT' | 'SENT' | 'CANCELLED' | 'VOIDED', updatedBy: userId },
      include: { lineItems: true, customer: true, supplier: true },
    });
  }

  async getInvoice(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: this.tenantWhere(tenantId, { id }) as Prisma.InvoiceWhereInput,
      include: {
        lineItems: { include: { product: true } },
        customer: true,
        supplier: true,
        payments: true,
        taxTransactions: true,
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async listInvoices(tenantId: string, input: InvoiceListInput) {
    const { skip, take, orderBy, page, limit } = parsePagination(input);

    const where: Prisma.InvoiceWhereInput = { tenantId };
    if (input.invoiceType) where.invoiceType = input.invoiceType;
    if (input.status) where.status = input.status;
    if (input.customerId) where.customerId = input.customerId;
    if (input.supplierId) where.supplierId = input.supplierId;
    if (input.dateRange) {
      where.createdAt = { gte: input.dateRange.from, lte: input.dateRange.to };
    }
    if (input.search) {
      where.OR = [
        { invoiceNumber: { contains: input.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { createdAt: 'desc' },
        include: { customer: true, supplier: true, lineItems: true },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  // ─── Payments ─────────────────────────────────────────────────

  async recordPayment(tenantId: string, userId: string, input: PaymentInput) {
    const paymentNumber = await this.generateNumber(tenantId, 'PAY', 'payment');

    // If linked to an invoice, validate and update paid amount
    if (input.invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: this.tenantWhere(tenantId, { id: input.invoiceId }) as Prisma.InvoiceWhereInput,
      });
      if (!invoice) throw new NotFoundException('Invoice not found');

      const newPaidPaise = invoice.paidPaise + BigInt(input.amountPaise);
      const newStatus = newPaidPaise >= invoice.totalPaise ? 'PAID' : 'PARTIALLY_PAID';

      await this.prisma.invoice.update({
        where: { id: input.invoiceId },
        data: { paidPaise: newPaidPaise, status: newStatus, updatedBy: userId },
      });
    }

    // Create the journal entry for this payment
    const journalEntry = await this.createPaymentJournalEntry(tenantId, userId, input);

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        paymentNumber,
        paymentType: input.paymentType,
        method: input.method,
        amountPaise: BigInt(input.amountPaise),
        currencyCode: input.currencyCode ?? 'INR',
        customerId: input.customerId ?? null,
        supplierId: input.supplierId ?? null,
        invoiceId: input.invoiceId ?? null,
        reference: input.reference ?? null,
        status: 'COMPLETED',
        processedAt: new Date(),
        journalEntryId: journalEntry.id,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { customer: true, supplier: true, invoice: true },
    });

    return payment;
  }

  private async createPaymentJournalEntry(tenantId: string, userId: string, input: PaymentInput) {
    const entryNumber = await this.generateNumber(tenantId, 'JE', 'journalEntry');
    const isReceived = input.paymentType === 'RECEIVED';
    const description = isReceived
      ? `Payment received via ${input.method}`
      : `Payment made via ${input.method}`;

    // For simplicity, use a generic cash/bank account and AR/AP account
    // In production, these would be configured per tenant
    const cashAccount = await this.prisma.account.findFirst({
      where: { tenantId, accountType: 'ASSET', accountCode: { startsWith: '1' } },
    });
    const counterAccount = await this.prisma.account.findFirst({
      where: {
        tenantId,
        accountType: isReceived ? 'ASSET' : 'LIABILITY',
        accountCode: { startsWith: isReceived ? '1' : '2' },
      },
    });

    if (!cashAccount || !counterAccount) {
      // Create minimal journal entry with placeholder logic
      return this.prisma.journalEntry.create({
        data: {
          tenantId,
          entryNumber,
          date: new Date(),
          description,
          reference: input.reference ?? null,
          status: 'POSTED',
          postedAt: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }

    return this.prisma.journalEntry.create({
      data: {
        tenantId,
        entryNumber,
        date: new Date(),
        description,
        reference: input.reference ?? null,
        status: 'POSTED',
        postedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
        lines: {
          create: [
            {
              tenantId,
              accountId: cashAccount.id,
              debitPaise: isReceived ? BigInt(input.amountPaise) : BigInt(0),
              creditPaise: isReceived ? BigInt(0) : BigInt(input.amountPaise),
              description,
              currencyCode: input.currencyCode ?? 'INR',
              exchangeRate: 10000,
            },
            {
              tenantId,
              accountId: counterAccount.id,
              debitPaise: isReceived ? BigInt(0) : BigInt(input.amountPaise),
              creditPaise: isReceived ? BigInt(input.amountPaise) : BigInt(0),
              description,
              currencyCode: input.currencyCode ?? 'INR',
              exchangeRate: 10000,
            },
          ],
        },
      },
    });
  }

  async getPayment(tenantId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: this.tenantWhere(tenantId, { id }) as Prisma.PaymentWhereInput,
      include: { customer: true, supplier: true, invoice: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async listPayments(tenantId: string, input: PaymentListInput) {
    const { skip, take, orderBy, page, limit } = parsePagination(input);

    const where: Prisma.PaymentWhereInput = { tenantId };
    if (input.paymentType) where.paymentType = input.paymentType;
    if (input.status) where.status = input.status;
    if (input.customerId) where.customerId = input.customerId;
    if (input.supplierId) where.supplierId = input.supplierId;
    if (input.dateRange) {
      where.createdAt = { gte: input.dateRange.from, lte: input.dateRange.to };
    }
    if (input.search) {
      where.OR = [
        { paymentNumber: { contains: input.search } },
        { reference: { contains: input.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { createdAt: 'desc' },
        include: { customer: true, supplier: true, invoice: true },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  // ─── Account Balance & Ledger ─────────────────────────────────

  async getAccountBalance(tenantId: string, accountId: string, dateRange?: { from: Date; to: Date }) {
    const where: Prisma.JournalEntryLineWhereInput = {
      tenantId,
      accountId,
      journalEntry: { status: 'POSTED' },
    };
    if (dateRange) {
      where.journalEntry = {
        ...where.journalEntry as Record<string, unknown>,
        date: { gte: dateRange.from, lte: dateRange.to },
      };
    }

    const lines = await this.prisma.journalEntryLine.findMany({ where });
    const totalDebit = lines.reduce((sum, l) => sum + Number(l.debitPaise), 0);
    const totalCredit = lines.reduce((sum, l) => sum + Number(l.creditPaise), 0);

    return { accountId, totalDebit, totalCredit, balance: totalDebit - totalCredit };
  }

  async getLedger(tenantId: string, accountId: string, dateRange: { from: Date; to: Date }) {
    const account = await this.prisma.account.findFirst({
      where: this.tenantWhere(tenantId, { id: accountId }) as Prisma.AccountWhereInput,
    });
    if (!account) throw new NotFoundException('Account not found');

    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        tenantId,
        accountId,
        journalEntry: { status: 'POSTED', date: { gte: dateRange.from, lte: dateRange.to } },
      },
      include: { journalEntry: true },
      orderBy: { journalEntry: { date: 'asc' } },
    });

    // Opening balance = all posted entries before from date
    const openingLines = await this.prisma.journalEntryLine.findMany({
      where: {
        tenantId,
        accountId,
        journalEntry: { status: 'POSTED', date: { lt: dateRange.from } },
      },
    });
    const openingBalance = openingLines.reduce(
      (sum, l) => sum + Number(l.debitPaise) - Number(l.creditPaise),
      0,
    );

    let runningBalance = openingBalance;
    const entries = lines.map((line) => {
      const debitPaise = Number(line.debitPaise);
      const creditPaise = Number(line.creditPaise);
      runningBalance += debitPaise - creditPaise;
      return {
        date: line.journalEntry.date.toISOString(),
        entryNumber: line.journalEntry.entryNumber,
        description: line.description ?? line.journalEntry.description,
        debitPaise,
        creditPaise,
        runningBalance,
      };
    });

    return {
      accountId,
      accountName: account.name,
      openingBalance,
      entries,
      closingBalance: runningBalance,
    };
  }

  async getTrialBalance(tenantId: string, dateRange: { from: Date; to: Date }) {
    const accounts = await this.prisma.account.findMany({
      where: { tenantId, isActive: true },
      orderBy: { accountCode: 'asc' },
    });

    const accountBalances = await Promise.all(
      accounts.map(async (account) => {
        const balance = await this.getAccountBalance(tenantId, account.id, dateRange);
        return {
          accountId: account.id,
          accountCode: account.accountCode,
          accountName: account.name,
          accountType: account.accountType,
          debitTotal: balance.totalDebit,
          creditTotal: balance.totalCredit,
          balance: balance.balance,
        };
      }),
    );

    // Filter out accounts with zero balance
    const nonZero = accountBalances.filter((a) => a.debitTotal > 0 || a.creditTotal > 0);
    const totalDebits = nonZero.reduce((sum, a) => sum + a.debitTotal, 0);
    const totalCredits = nonZero.reduce((sum, a) => sum + a.creditTotal, 0);

    return {
      asOfDate: dateRange.to.toISOString(),
      accounts: nonZero,
      totalDebits,
      totalCredits,
    };
  }
}
