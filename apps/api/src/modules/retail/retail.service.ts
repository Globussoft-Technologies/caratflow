// ─── Retail Sale Service ───────────────────────────────────────
// Core POS sale operations: create, list, get, void.

import { Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { PlatformPdfService } from '../platform/platform.pdf.service';
import type { SaleInput, SaleResponse, SaleListFilter } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { SaleStatus, SalePaymentStatus } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { RetailPricingService } from './retail.pricing.service';
import { IndiaRatesService } from '../india/india.rates.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RetailService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly pricingService: RetailPricingService,
    private readonly ratesService: IndiaRatesService,
    @Optional() private readonly pdfService?: PlatformPdfService,
  ) {
    super(prisma);
  }

  /**
   * Render a POS sale receipt as an 80mm thermal-style PDF buffer.
   */
  async generateSaleReceipt(tenantId: string, saleId: string): Promise<Buffer> {
    if (!this.pdfService) {
      throw new BadRequestException('PDF service not available');
    }
    const sale = await this.getSale(tenantId, saleId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = sale as any;

    const items: ReadonlyArray<Record<string, unknown>> = (s.lineItems ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (li: any) => ({
        item: li.description ?? li.productName ?? li.productId ?? '',
        qty: li.quantity ?? 1,
        amt: li.totalPaise
          ? (Number(li.totalPaise) / 100).toFixed(2)
          : li.amount ?? '',
      }),
    );

    const rowsHtml = items
      .map(
        (it) =>
          `<tr><td>${this.pdfService!.escapeHtml(String(it.item))}</td>` +
          `<td class="right">${it.qty}</td>` +
          `<td class="right">${it.amt}</td></tr>`,
      )
      .join('\n');

    const firstPayment = s.payments?.[0];
    return this.pdfService.renderTemplate('sale-receipt', {
      tenantName: s.tenantName ?? 'CaratFlow Jewellery',
      tenantAddress: s.tenantAddress ?? '',
      tenantGstin: s.tenantGstin ?? '',
      tenantContact: s.tenantContact ?? '',
      saleNumber: s.saleNumber,
      saleDate: s.createdAt
        ? new Date(s.createdAt).toISOString().replace('T', ' ').slice(0, 16)
        : '',
      cashier: s.userId ?? '',
      customerName: s.customerName ?? '',
      locationName: s.locationName ?? '',
      lineItemsRows: rowsHtml,
      subtotal: s.subtotalPaise ? (Number(s.subtotalPaise) / 100).toFixed(2) : '0.00',
      gst: s.taxPaise ? (Number(s.taxPaise) / 100).toFixed(2) : '0.00',
      discount: s.discountPaise ? (Number(s.discountPaise) / 100).toFixed(2) : '0.00',
      total: s.totalPaise ? (Number(s.totalPaise) / 100).toFixed(2) : '0.00',
      currency: s.currency ?? 'INR',
      paymentMethod: firstPayment?.method ?? '',
      paid: firstPayment?.amountPaise
        ? (Number(firstPayment.amountPaise) / 100).toFixed(2)
        : '0.00',
      change: s.changePaise ? (Number(s.changePaise) / 100).toFixed(2) : '0.00',
      generatedAt: new Date().toISOString(),
    });
  }

  /**
   * Generate sale number in format: PREFIX/LOC/YYMM/SEQ
   * e.g., SJ/MUM/2604/0001
   */
  private async generateSaleNumber(tenantId: string, locationId: string): Promise<string> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId },
      select: { name: true, city: true },
    });

    const locCode = (location?.city ?? 'LOC').substring(0, 3).toUpperCase();
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Count existing sales for this tenant/location/month
    const prefix = `%/${locCode}/${yymm}/%`;
    const count = await this.prisma.sale.count({
      where: {
        tenantId,
        locationId,
        saleNumber: { contains: `/${locCode}/${yymm}/` },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `SL/${locCode}/${yymm}/${seq}`;
  }

  /**
   * Create a completed sale with line items and payments.
   * Validates payments cover the total, calculates taxes, persists in a transaction.
   */
  async createSale(tenantId: string, userId: string, input: SaleInput): Promise<SaleResponse> {
    // Calculate taxes for line items (use location state for GST)
    const location = await this.prisma.location.findFirst({
      where: { id: input.locationId, tenantId },
      select: { state: true },
    });
    const locationState = location?.state ?? 'MH';

    // Determine customer state for inter/intra-state GST
    let customerState = locationState;
    if (input.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: input.customerId, tenantId },
        select: { state: true },
      });
      customerState = customer?.state ?? locationState;
    }

    const lineItemsWithTax = this.pricingService.calculateTax(input.lineItems, {
      sourceState: locationState,
      destinationState: customerState,
    });

    const totals = this.pricingService.calculateTotal(lineItemsWithTax, input.discountPaise ?? 0);

    // Validate payments cover total
    const totalPayments = input.payments.reduce((sum, p) => sum + p.amountPaise, 0);
    if (totalPayments < totals.totalPaise) {
      throw new BadRequestException(
        `Payment total (${totalPayments}) is less than sale total (${totals.totalPaise})`,
      );
    }

    const saleNumber = await this.generateSaleNumber(tenantId, input.locationId);
    const saleId = uuidv4();

    const sale = await this.prisma.$transaction(async (tx) => {
      // Create sale
      const created = await tx.sale.create({
        data: {
          id: saleId,
          tenantId,
          saleNumber,
          customerId: input.customerId ?? null,
          locationId: input.locationId,
          userId,
          status: 'COMPLETED',
          subtotalPaise: BigInt(totals.subtotalPaise),
          discountPaise: BigInt(totals.discountPaise),
          taxPaise: BigInt(totals.taxPaise),
          totalPaise: BigInt(totals.totalPaise),
          currencyCode: input.currencyCode ?? 'INR',
          roundOffPaise: BigInt(totals.roundOffPaise),
          notes: input.notes ?? null,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // Create line items
      for (const liTax of lineItemsWithTax) {
        const li = liTax.item;
        await tx.saleLineItem.create({
          data: {
            id: uuidv4(),
            tenantId,
            saleId,
            productId: li.productId ?? null,
            description: li.description,
            quantity: li.quantity,
            unitPricePaise: BigInt(li.unitPricePaise),
            discountPaise: BigInt(li.discountPaise ?? 0),
            discountType: li.discountType ?? null,
            makingChargesPaise: BigInt(li.makingChargesPaise ?? 0),
            wastageChargesPaise: BigInt(li.wastageChargesPaise ?? 0),
            metalRatePaise: BigInt(li.metalRatePaise ?? 0),
            metalWeightMg: BigInt(li.metalWeightMg ?? 0),
            hsnCode: li.hsnCode ?? '7113',
            gstRate: li.gstRate ?? 300,
            cgstPaise: BigInt(liTax.cgstPaise),
            sgstPaise: BigInt(liTax.sgstPaise),
            igstPaise: BigInt(liTax.igstPaise),
            lineTotalPaise: BigInt(liTax.lineTotalPaise),
          },
        });
      }

      // Create payments
      for (const payment of input.payments) {
        await tx.salePayment.create({
          data: {
            id: uuidv4(),
            tenantId,
            saleId,
            method: payment.method,
            amountPaise: BigInt(payment.amountPaise),
            reference: payment.reference ?? null,
            status: 'COMPLETED',
            processedAt: new Date(),
          },
        });
      }

      return created;
    });

    // Publish domain event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'retail.sale.completed',
      payload: {
        saleId: sale.id,
        customerId: input.customerId ?? '',
        totalPaise: totals.totalPaise,
        items: input.lineItems.map((li) => ({
          productId: li.productId ?? '',
          pricePaise: li.unitPricePaise * li.quantity,
        })),
      },
    });

    return this.getSale(tenantId, sale.id);
  }

  /**
   * Get a single sale with all line items and payments.
   */
  async getSale(tenantId: string, saleId: string): Promise<SaleResponse> {
    const sale = await this.prisma.sale.findFirst({
      where: this.tenantWhere(tenantId, { id: saleId }) as { tenantId: string; id: string },
      include: {
        lineItems: true,
        payments: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return this.mapSaleToResponse(sale);
  }

  /**
   * List sales with filters and pagination.
   */
  async listSales(
    tenantId: string,
    filters: SaleListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<SaleResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.userId) where.userId = filters.userId;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) (where.createdAt as Record<string, unknown>).gte = filters.dateFrom;
      if (filters.dateTo) (where.createdAt as Record<string, unknown>).lte = filters.dateTo;
    }

    if (filters.search) {
      where.OR = [
        { saleNumber: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: { lineItems: true, payments: true },
        orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.sale.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((s) => this.mapSaleToResponse(s)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Void a sale with a reason.
   */
  async voidSale(tenantId: string, userId: string, saleId: string, reason: string): Promise<SaleResponse> {
    const sale = await this.prisma.sale.findFirst({
      where: this.tenantWhere(tenantId, { id: saleId }) as { tenantId: string; id: string },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    if (sale.status !== 'COMPLETED') {
      throw new BadRequestException('Only completed sales can be voided');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: saleId },
        data: {
          status: 'VOIDED',
          notes: sale.notes ? `${sale.notes}\nVOIDED: ${reason}` : `VOIDED: ${reason}`,
          updatedBy: userId,
        },
      });

      // Mark all payments as refunded
      await tx.salePayment.updateMany({
        where: { saleId, tenantId },
        data: { status: 'REFUNDED' },
      });
    });

    return this.getSale(tenantId, saleId);
  }

  /**
   * Get POS session summary for today at a given location.
   */
  async getPosSession(tenantId: string, locationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        locationId,
        status: 'COMPLETED',
        createdAt: { gte: today, lt: tomorrow },
      },
      include: {
        payments: true,
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const todaySalesCount = sales.length;
    const todayRevenuePaise = sales.reduce((sum, s) => sum + Number(s.totalPaise), 0);
    const averageTicketPaise = todaySalesCount > 0 ? Math.round(todayRevenuePaise / todaySalesCount) : 0;

    // Payment breakdown
    const paymentMap = new Map<string, { totalPaise: number; count: number }>();
    for (const sale of sales) {
      for (const payment of sale.payments) {
        const existing = paymentMap.get(payment.method) ?? { totalPaise: 0, count: 0 };
        existing.totalPaise += Number(payment.amountPaise);
        existing.count += 1;
        paymentMap.set(payment.method, existing);
      }
    }

    const paymentBreakdown = Array.from(paymentMap.entries()).map(([method, data]) => ({
      method: method as SalePaymentStatus,
      totalPaise: data.totalPaise,
      count: data.count,
    }));

    const recentSales = sales.slice(0, 10).map((s) => ({
      id: s.id,
      saleNumber: s.saleNumber,
      customerName: s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : null,
      totalPaise: Number(s.totalPaise),
      status: s.status as SaleStatus,
      createdAt: s.createdAt,
    }));

    return {
      todaySalesCount,
      todayRevenuePaise,
      averageTicketPaise,
      paymentBreakdown,
      recentSales,
    };
  }

  /**
   * Get retail dashboard data.
   */
  async getDashboard(tenantId: string, locationId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const baseWhere: Record<string, unknown> = { tenantId, status: 'COMPLETED' };
    if (locationId) baseWhere.locationId = locationId;

    const [todaySales, monthSales, pendingReturns, activeRepairs, activeCustomOrders, activeLayaways] =
      await Promise.all([
        this.prisma.sale.findMany({
          where: { ...baseWhere, createdAt: { gte: today, lt: tomorrow } },
          include: {
            payments: true,
            customer: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.sale.aggregate({
          where: { ...baseWhere, createdAt: { gte: monthStart, lt: tomorrow } },
          _sum: { totalPaise: true },
        }),
        this.prisma.saleReturn.count({
          where: { tenantId, status: 'DRAFT' },
        }),
        this.prisma.repairOrder.count({
          where: {
            tenantId,
            status: { in: ['RECEIVED', 'DIAGNOSED', 'QUOTED', 'APPROVED', 'IN_PROGRESS'] },
          },
        }),
        this.prisma.customOrder.count({
          where: {
            tenantId,
            status: { in: ['INQUIRY', 'DESIGNED', 'QUOTED', 'CONFIRMED', 'DEPOSIT_PAID', 'IN_PRODUCTION'] },
          },
        }),
        this.prisma.layaway.count({
          where: { tenantId, status: 'ACTIVE' },
        }),
      ]);

    const todaySalesCount = todaySales.length;
    const todayRevenuePaise = todaySales.reduce((sum, s) => sum + Number(s.totalPaise), 0);
    const averageTicketPaise = todaySalesCount > 0 ? Math.round(todayRevenuePaise / todaySalesCount) : 0;
    const monthRevenuePaise = Number(monthSales._sum.totalPaise ?? 0n);

    // Payment breakdown for today
    const paymentMap = new Map<string, { totalPaise: number; count: number }>();
    for (const sale of todaySales) {
      for (const payment of sale.payments) {
        const existing = paymentMap.get(payment.method) ?? { totalPaise: 0, count: 0 };
        existing.totalPaise += Number(payment.amountPaise);
        existing.count += 1;
        paymentMap.set(payment.method, existing);
      }
    }

    const recentSales = todaySales.slice(0, 10).map((s) => ({
      id: s.id,
      saleNumber: s.saleNumber,
      customerName: s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : null,
      totalPaise: Number(s.totalPaise),
      status: s.status as SaleStatus,
      createdAt: s.createdAt,
    }));

    return {
      todaySalesCount,
      todayRevenuePaise,
      averageTicketPaise,
      monthRevenuePaise,
      pendingReturns,
      activeRepairs,
      activeCustomOrders,
      activeLayaways,
      topProducts: [], // Would require aggregation query on line items
      paymentBreakdown: Array.from(paymentMap.entries()).map(([method, data]) => ({
        method,
        totalPaise: data.totalPaise,
        count: data.count,
      })),
      recentSales,
    };
  }

  /**
   * Staff (sales associate) dashboard used by the mobile Sales app.
   * Aggregates sales the given user rang up on the given date (defaults to today),
   * pending repair orders, recent transactions, and current metal rates.
   *
   * Note: RepairOrder has no `staffUserId` column in the current schema, so
   * "pending repairs" is scoped to the tenant (active statuses) until an
   * assignee relation is added to the schema.
   */
  async getStaffDashboard(
    tenantId: string,
    userId: string,
    date?: Date,
  ): Promise<{
    mySalesCount: number;
    myRevenuePaise: number;
    pendingRepairs: Array<{
      id: string;
      repairNumber: string;
      customerName: string;
      status: string;
      itemDescription: string;
    }>;
    recentTransactions: Array<{
      id: string;
      saleNumber: string;
      customerName: string | null;
      totalPaise: number;
      createdAt: Date;
    }>;
    goldRatePer10g: number;
    silverRatePer10g: number;
  }> {
    const start = date ? new Date(date) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const [mySales, pendingRepairs] = await Promise.all([
      this.prisma.sale.findMany({
        where: {
          tenantId,
          userId,
          status: 'COMPLETED',
          createdAt: { gte: start, lt: end },
        },
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.repairOrder.findMany({
        where: {
          tenantId,
          staffUserId: userId,
          status: { in: ['RECEIVED', 'DIAGNOSED', 'QUOTED', 'APPROVED', 'IN_PROGRESS'] },
        },
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const mySalesCount = mySales.length;
    const myRevenuePaise = mySales.reduce(
      (sum, s) => sum + Number(s.totalPaise),
      0,
    );

    const recentTransactions = mySales.slice(0, 10).map((s) => ({
      id: s.id,
      saleNumber: s.saleNumber,
      customerName: s.customer
        ? `${s.customer.firstName} ${s.customer.lastName}`
        : null,
      totalPaise: Number(s.totalPaise),
      createdAt: s.createdAt,
    }));

    const pendingRepairsMapped = pendingRepairs.map((r) => ({
      id: r.id,
      repairNumber: r.repairNumber,
      customerName: `${r.customer.firstName} ${r.customer.lastName}`,
      status: r.status as string,
      itemDescription: r.itemDescription,
    }));

    // Metal rates: try 22K gold (fineness 916) + .999 silver (fineness 999).
    // IndiaRatesService.getCurrentRate throws NotFoundException when no rates
    // exist — degrade gracefully to 0.
    let goldRatePer10g = 0;
    let silverRatePer10g = 0;
    try {
      const gold = await this.ratesService.getCurrentRate('GOLD', 916);
      goldRatePer10g = gold.ratePer10gPaise;
    } catch {
      // No gold rate recorded yet — leave at 0.
    }
    try {
      const silver = await this.ratesService.getCurrentRate('SILVER', 999);
      silverRatePer10g = silver.ratePer10gPaise;
    } catch {
      // No silver rate recorded yet — leave at 0.
    }

    return {
      mySalesCount,
      myRevenuePaise,
      pendingRepairs: pendingRepairsMapped,
      recentTransactions,
      goldRatePer10g,
      silverRatePer10g,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapSaleToResponse(sale: Record<string, unknown>): SaleResponse {
    const s = sale as Record<string, unknown>;
    const lineItems = (s.lineItems as Array<Record<string, unknown>>) ?? [];
    const payments = (s.payments as Array<Record<string, unknown>>) ?? [];

    return {
      id: s.id as string,
      tenantId: s.tenantId as string,
      saleNumber: s.saleNumber as string,
      customerId: (s.customerId as string) ?? null,
      locationId: s.locationId as string,
      userId: s.userId as string,
      status: s.status as SaleStatus,
      subtotalPaise: Number(s.subtotalPaise),
      discountPaise: Number(s.discountPaise),
      taxPaise: Number(s.taxPaise),
      totalPaise: Number(s.totalPaise),
      currencyCode: s.currencyCode as string,
      roundOffPaise: Number(s.roundOffPaise),
      notes: (s.notes as string) ?? null,
      lineItems: lineItems.map((li) => ({
        id: li.id as string,
        saleId: li.saleId as string,
        productId: (li.productId as string) ?? undefined,
        description: li.description as string,
        quantity: li.quantity as number,
        unitPricePaise: Number(li.unitPricePaise),
        discountPaise: Number(li.discountPaise),
        discountType: li.discountType as 'PERCENTAGE' | 'FIXED' | undefined,
        makingChargesPaise: Number(li.makingChargesPaise),
        wastageChargesPaise: Number(li.wastageChargesPaise),
        metalRatePaise: Number(li.metalRatePaise),
        metalWeightMg: Number(li.metalWeightMg),
        hsnCode: li.hsnCode as string,
        gstRate: li.gstRate as number,
        cgstPaise: Number(li.cgstPaise),
        sgstPaise: Number(li.sgstPaise),
        igstPaise: Number(li.igstPaise),
        lineTotalPaise: Number(li.lineTotalPaise),
      })),
      payments: payments.map((p) => ({
        id: p.id as string,
        saleId: p.saleId as string,
        method: p.method as string,
        amountPaise: Number(p.amountPaise),
        reference: (p.reference as string) ?? undefined,
        status: p.status as SalePaymentStatus,
        processedAt: p.processedAt ? new Date(p.processedAt as string) : null,
      })),
      createdAt: new Date(s.createdAt as string),
      updatedAt: new Date(s.updatedAt as string),
    } as SaleResponse;
  }
}
