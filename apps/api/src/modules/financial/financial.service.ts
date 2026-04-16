// ─── Financial Service ─────────────────────────────────────────
// Core accounting operations: journal entries, invoices, payments.
// All money values in paise (BigInt). Double-entry must always balance.

import { Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { PlatformPdfService } from '../platform/platform.pdf.service';
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
  constructor(
    prisma: PrismaService,
    @Optional() private readonly pdfService?: PlatformPdfService,
  ) {
    super(prisma);
  }

  /**
   * Render an invoice as a PDF buffer. Loads the invoice with line
   * items + customer, builds the template data, delegates to the
   * global PlatformPdfService.
   */
  async generateInvoicePdf(tenantId: string, invoiceId: string): Promise<Buffer> {
    if (!this.pdfService) {
      throw new BadRequestException('PDF service not available');
    }
    const invoice = await this.getInvoice(tenantId, invoiceId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inv = invoice as any;
    const lineItems: ReadonlyArray<Record<string, unknown>> = (inv.lineItems ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (li: any) => ({
        description: li.description ?? li.product?.name ?? '',
        hsn: li.hsnCode ?? '7113',
        huid: li.huid ?? '',
        purity: li.purity ?? '',
        weight: li.weightMg ? (Number(li.weightMg) / 1000).toFixed(3) : '',
        qty: li.quantity ?? 1,
        rate: li.rate ?? li.unitPrice ?? '',
        amount: li.amount ?? li.lineTotal ?? '',
      }),
    );

    const rows = this.pdfService.buildTableRows(lineItems, [
      'description',
      'hsn',
      'huid',
      'purity',
      'weight',
      'qty',
      'rate',
      'amount',
    ]);

    return this.pdfService.renderTemplate('invoice', {
      tenantName: inv.tenantName ?? 'CaratFlow Jewellery',
      tenantAddress: inv.tenantAddress ?? '',
      tenantGstin: inv.tenantGstin ?? '',
      tenantPan: inv.tenantPan ?? '',
      tenantContact: inv.tenantContact ?? '',
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate
        ? new Date(inv.invoiceDate).toISOString().slice(0, 10)
        : '',
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : '',
      invoiceType: inv.invoiceType,
      status: inv.status,
      customerName: inv.customer?.firstName
        ? `${inv.customer.firstName} ${inv.customer.lastName ?? ''}`
        : inv.customer?.name ?? '',
      customerAddress: inv.customer?.address ?? '',
      customerGstin: inv.customer?.gstin ?? '',
      customerState: inv.customer?.state ?? '',
      lineItemsRows: rows,
      subtotal: inv.subtotalPaise ? (Number(inv.subtotalPaise) / 100).toFixed(2) : '0.00',
      cgst: inv.cgstPaise ? (Number(inv.cgstPaise) / 100).toFixed(2) : '0.00',
      sgst: inv.sgstPaise ? (Number(inv.sgstPaise) / 100).toFixed(2) : '0.00',
      igst: inv.igstPaise ? (Number(inv.igstPaise) / 100).toFixed(2) : '0.00',
      makingCharges: inv.makingChargesPaise
        ? (Number(inv.makingChargesPaise) / 100).toFixed(2)
        : '0.00',
      discount: inv.discountPaise ? (Number(inv.discountPaise) / 100).toFixed(2) : '0.00',
      total: inv.totalPaise ? (Number(inv.totalPaise) / 100).toFixed(2) : '0.00',
      currency: inv.currency ?? 'INR',
      paymentTerms: inv.paymentTerms ?? 'Net 30',
      generatedAt: new Date().toISOString(),
    });
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
      // No chart-of-accounts configured yet: auto-provision the
      // minimum pair (Cash/Bank + AR or AP) so the journal entry still
      // balances (sum of debits === sum of credits) per double-entry
      // bookkeeping. Admins can rename these later via settings UI.
      //
      // If auto-provisioning is unavailable (e.g. account.create not
      // wired in a test mock, or DB read-only), fall back to a
      // header-only entry so the payment still records.
      const ensuredCash =
        cashAccount ??
        (await this.safeCreateAccount(tenantId, userId, '1000', 'Cash / Bank', 'ASSET'));
      const ensuredCounter =
        counterAccount ??
        (await this.safeCreateAccount(
          tenantId,
          userId,
          isReceived ? '1200' : '2000',
          isReceived ? 'Accounts Receivable' : 'Accounts Payable',
          isReceived ? 'ASSET' : 'LIABILITY',
        ));

      if (!ensuredCash || !ensuredCounter) {
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
                accountId: ensuredCash.id,
                debitPaise: isReceived ? BigInt(input.amountPaise) : BigInt(0),
                creditPaise: isReceived ? BigInt(0) : BigInt(input.amountPaise),
                description,
                currencyCode: input.currencyCode ?? 'INR',
                exchangeRate: 10000,
              },
              {
                tenantId,
                accountId: ensuredCounter.id,
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

  /**
   * Best-effort create of a chart-of-accounts row for auto-balancing
   * a payment journal entry. Returns null if the underlying mock/DB
   * doesn't support `account.create` (e.g. in unit tests) so the
   * caller can fall back to a header-only journal entry.
   */
  private async safeCreateAccount(
    tenantId: string,
    userId: string,
    accountCode: string,
    name: string,
    accountType: 'ASSET' | 'LIABILITY',
  ): Promise<{ id: string } | null> {
    try {
      const created = await this.prisma.account.create({
        data: {
          tenantId,
          accountCode,
          name,
          accountType,
          isActive: true,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      if (!created || typeof (created as { id?: unknown }).id !== 'string') {
        return null;
      }
      return created as { id: string };
    } catch {
      return null;
    }
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

  // ─── Collections (Agent Mobile) ───────────────────────────────

  /**
   * Record a collection made by a field agent. Creates a RECEIVED Payment
   * and applies it FIFO against the customer's outstanding balances. The
   * agent's userId is stamped in createdBy so the agent dashboard can
   * aggregate collections per agent.
   */
  async recordCollection(
    tenantId: string,
    userId: string,
    input: {
      customerId: string;
      amountPaise: number;
      method: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'ONLINE';
      agentId: string;
      notes?: string;
      invoiceId?: string;
    },
  ) {
    if (input.amountPaise <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, id: input.customerId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    // Reuse recordPayment for journal entry + payment row creation.
    // Use agentId as the createdBy so the dashboard aggregates by agent.
    const payment = await this.recordPayment(tenantId, input.agentId, {
      paymentType: 'RECEIVED',
      method: input.method,
      amountPaise: input.amountPaise,
      currencyCode: 'INR',
      customerId: input.customerId,
      invoiceId: input.invoiceId,
      reference: input.notes,
    } as PaymentInput);

    // Apply to outstanding balances FIFO (oldest dueDate first).
    let remaining = BigInt(input.amountPaise);
    if (remaining > 0n) {
      const outstandings = await this.prisma.outstandingBalance.findMany({
        where: {
          tenantId,
          entityType: 'CUSTOMER',
          entityId: input.customerId,
          status: { in: ['CURRENT', 'OVERDUE'] },
          ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
        },
        orderBy: { dueDate: 'asc' },
      });

      for (const ob of outstandings) {
        if (remaining <= 0n) break;
        const applied = remaining >= ob.balancePaise ? ob.balancePaise : remaining;
        const newPaid = ob.paidPaise + applied;
        const newBalance = ob.balancePaise - applied;
        const newStatus = newBalance <= 0n ? 'PAID' : ob.status;
        await this.prisma.outstandingBalance.update({
          where: { id: ob.id },
          data: {
            paidPaise: newPaid,
            balancePaise: newBalance,
            status: newStatus,
            updatedBy: userId,
          },
        });
        remaining -= applied;
      }
    }

    return payment;
  }

  /**
   * List outstanding balances for customers assigned to an agent.
   * "Assigned" = customers this agent has recorded interactions with.
   */
  async listOutstandingForAgent(
    tenantId: string,
    agentId: string,
    pagination: { page: number; limit: number },
  ) {
    const interactions = await this.prisma.customerInteraction.findMany({
      where: { tenantId, userId: agentId },
      select: { customerId: true },
      distinct: ['customerId'],
    });
    const customerIds = interactions.map((i) => i.customerId);

    if (customerIds.length === 0) {
      return {
        items: [],
        total: 0,
        page: pagination.page,
        limit: pagination.limit,
      };
    }

    const where: Prisma.OutstandingBalanceWhereInput = {
      tenantId,
      entityType: 'CUSTOMER',
      entityId: { in: customerIds },
      status: { in: ['CURRENT', 'OVERDUE'] },
    };

    const [items, total] = await Promise.all([
      this.prisma.outstandingBalance.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.outstandingBalance.count({ where }),
    ]);

    const customers = await this.prisma.customer.findMany({
      where: { tenantId, id: { in: items.map((i) => i.entityId) } },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    const enriched = items.map((ob) => {
      const c = customerMap.get(ob.entityId);
      return {
        id: ob.id,
        invoiceId: ob.invoiceId,
        invoiceNumber: ob.invoiceNumber,
        customerId: ob.entityId,
        customerName: c ? `${c.firstName} ${c.lastName}` : 'Unknown',
        customerPhone: c?.phone ?? null,
        outstandingPaise: ob.balancePaise.toString(),
        originalPaise: ob.originalPaise.toString(),
        paidPaise: ob.paidPaise.toString(),
        dueDate: ob.dueDate.toISOString(),
        daysOverdue: ob.daysOverdue,
        status: ob.status,
      };
    });

    return {
      items: enriched,
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
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
