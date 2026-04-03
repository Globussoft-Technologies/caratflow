// ─── Export Invoice Service ──────────────────────────────────────
// Export invoicing: create commercial/proforma/customs invoice,
// LUT handling (Letter of Undertaking for zero-rated IGST exports),
// AD code, IE code management, multi-currency with locked exchange rate.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  ExportInvoiceInput,
  ExportInvoiceResponse,
  ExportInvoiceItemResponse,
} from '@caratflow/shared-types';
import { ExportInvoiceType } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ExportInvoiceService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── Invoice Number Generation ──────────────────────────────────

  private async generateInvoiceNumber(tenantId: string, invoiceType: ExportInvoiceType): Promise<string> {
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = invoiceType === 'PROFORMA' ? 'PI' : invoiceType === 'CUSTOMS' ? 'CI' : 'EI';

    const count = await this.prisma.exportInvoice.count({
      where: { tenantId, invoiceNumber: { contains: `/${yymm}/` } },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}/${yymm}/${seq}`;
  }

  // ─── Create Export Invoice ──────────────────────────────────────

  async createInvoice(
    tenantId: string,
    userId: string,
    input: ExportInvoiceInput,
  ): Promise<ExportInvoiceResponse> {
    // Validate export order exists
    const exportOrder = await this.prisma.exportOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: input.exportOrderId }) as { tenantId: string; id: string },
    });
    if (!exportOrder) throw new NotFoundException('Export order not found');

    // Validate buyer
    const buyer = await this.prisma.customer.findFirst({
      where: this.tenantWhere(tenantId, { id: input.buyerId }) as { tenantId: string; id: string },
    });
    if (!buyer) throw new NotFoundException('Buyer not found');

    // IE Code is mandatory for all exporters
    if (!input.ieCode) {
      throw new BadRequestException('IE Code (Import Export Code) is mandatory for export invoices');
    }

    // For commercial invoices with zero IGST, LUT number is required
    if (input.invoiceType === 'COMMERCIAL' && (!input.igstPaise || input.igstPaise === 0) && !input.lutNumber) {
      throw new BadRequestException(
        'LUT number is required for zero-rated IGST exports. Provide lutNumber or set igstPaise > 0',
      );
    }

    // Calculate totals from items
    let subtotalPaise = 0n;
    const itemsData = input.items.map((item) => {
      const itemTotal = BigInt(item.unitPricePaise) * BigInt(item.quantity);
      subtotalPaise += itemTotal;
      return {
        id: uuidv4(),
        tenantId,
        description: item.description,
        exportOrderItemId: item.exportOrderItemId ?? null,
        quantity: item.quantity,
        unitPricePaise: BigInt(item.unitPricePaise),
        totalPricePaise: itemTotal,
        hsCode: item.hsCode,
        weightMg: BigInt(item.weightMg),
        netWeightMg: BigInt(item.netWeightMg),
        countryOfOrigin: item.countryOfOrigin ?? 'IN',
      };
    });

    const igstPaise = BigInt(input.igstPaise ?? 0);
    const totalPaise = subtotalPaise + igstPaise;
    const invoiceNumber = await this.generateInvoiceNumber(tenantId, input.invoiceType);
    const invoiceId = uuidv4();

    await this.prisma.$transaction(async (tx) => {
      await tx.exportInvoice.create({
        data: {
          id: invoiceId,
          tenantId,
          invoiceNumber,
          exportOrderId: input.exportOrderId,
          invoiceType: input.invoiceType,
          buyerId: input.buyerId,
          currencyCode: input.currencyCode,
          exchangeRate: input.exchangeRate, // Locked at creation time
          subtotalPaise,
          totalPaise,
          igstPaise,
          lutNumber: input.lutNumber ?? null,
          lutDate: input.lutDate ?? null,
          adCode: input.adCode ?? null,
          ieCode: input.ieCode,
          preCarriageBy: input.preCarriageBy ?? null,
          placeOfReceipt: input.placeOfReceipt ?? null,
          vesselFlightNo: input.vesselFlightNo ?? null,
          portOfLoading: input.portOfLoading ?? null,
          portOfDischarge: input.portOfDischarge ?? null,
          finalDestination: input.finalDestination ?? null,
          terms: input.terms ?? null,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      for (const item of itemsData) {
        await tx.exportInvoiceItem.create({
          data: {
            ...item,
            invoiceId,
          },
        });
      }
    });

    // Publish event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'export.invoice.created',
      payload: {
        invoiceId,
        invoiceNumber,
        exportOrderId: input.exportOrderId,
        totalPaise: Number(totalPaise),
      },
    });

    return this.getInvoice(tenantId, invoiceId);
  }

  // ─── Get Invoice ────────────────────────────────────────────────

  async getInvoice(tenantId: string, invoiceId: string): Promise<ExportInvoiceResponse> {
    const invoice = await this.prisma.exportInvoice.findFirst({
      where: this.tenantWhere(tenantId, { id: invoiceId }) as { tenantId: string; id: string },
      include: {
        items: true,
        buyer: { select: { firstName: true, lastName: true } },
      },
    });

    if (!invoice) throw new NotFoundException('Export invoice not found');
    return this.mapInvoiceToResponse(invoice);
  }

  // ─── List Invoices ──────────────────────────────────────────────

  async listInvoices(
    tenantId: string,
    filters: {
      invoiceType?: ExportInvoiceType;
      exportOrderId?: string;
      buyerId?: string;
      search?: string;
    },
    pagination: Pagination,
  ): Promise<PaginatedResult<ExportInvoiceResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.invoiceType) where.invoiceType = filters.invoiceType;
    if (filters.exportOrderId) where.exportOrderId = filters.exportOrderId;
    if (filters.buyerId) where.buyerId = filters.buyerId;
    if (filters.search) {
      where.OR = [{ invoiceNumber: { contains: filters.search } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.exportInvoice.findMany({
        where,
        include: {
          items: true,
          buyer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.exportInvoice.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((inv) => this.mapInvoiceToResponse(inv)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  // ─── Mapper ─────────────────────────────────────────────────────

  private mapInvoiceToResponse(invoice: Record<string, unknown>): ExportInvoiceResponse {
    const inv = invoice as Record<string, unknown>;
    const items = (inv.items as Array<Record<string, unknown>>) ?? [];
    const buyer = inv.buyer as Record<string, unknown> | undefined;

    return {
      id: inv.id as string,
      tenantId: inv.tenantId as string,
      invoiceNumber: inv.invoiceNumber as string,
      exportOrderId: inv.exportOrderId as string,
      invoiceType: inv.invoiceType as ExportInvoiceType,
      buyerId: inv.buyerId as string,
      buyerName: buyer ? `${buyer.firstName as string} ${buyer.lastName as string}` : undefined,
      currencyCode: inv.currencyCode as string,
      exchangeRate: inv.exchangeRate as number,
      subtotalPaise: Number(inv.subtotalPaise),
      totalPaise: Number(inv.totalPaise),
      igstPaise: Number(inv.igstPaise),
      lutNumber: (inv.lutNumber as string) ?? null,
      lutDate: inv.lutDate ? new Date(inv.lutDate as string).toISOString() : null,
      adCode: (inv.adCode as string) ?? null,
      ieCode: inv.ieCode as string,
      preCarriageBy: (inv.preCarriageBy as string) ?? null,
      placeOfReceipt: (inv.placeOfReceipt as string) ?? null,
      vesselFlightNo: (inv.vesselFlightNo as string) ?? null,
      portOfLoading: (inv.portOfLoading as string) ?? null,
      portOfDischarge: (inv.portOfDischarge as string) ?? null,
      finalDestination: (inv.finalDestination as string) ?? null,
      terms: (inv.terms as string) ?? null,
      items: items.map((item) => ({
        id: item.id as string,
        exportOrderItemId: (item.exportOrderItemId as string) ?? null,
        description: item.description as string,
        quantity: item.quantity as number,
        unitPricePaise: Number(item.unitPricePaise),
        totalPricePaise: Number(item.totalPricePaise),
        hsCode: item.hsCode as string,
        weightMg: Number(item.weightMg),
        netWeightMg: Number(item.netWeightMg),
        countryOfOrigin: item.countryOfOrigin as string,
      })),
      createdAt: new Date(inv.createdAt as string).toISOString(),
      updatedAt: new Date(inv.updatedAt as string).toISOString(),
    };
  }
}
