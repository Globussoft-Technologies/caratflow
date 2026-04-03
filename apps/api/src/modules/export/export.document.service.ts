// ─── Export Document Service ─────────────────────────────────────
// Shipping documents: generate packing list, shipping bill data,
// bill of lading, certificate of origin, ARE-1/ARE-3 forms, GR form.
// Track document status.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  ShippingDocumentInput,
  ShippingDocumentResponse,
  PackingListData,
  ShippingBillData,
  CertificateOfOriginData,
} from '@caratflow/shared-types';
import { ShippingDocumentType, ShippingDocumentStatus } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ExportDocumentService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── Create Shipping Document ───────────────────────────────────

  async createDocument(
    tenantId: string,
    userId: string,
    input: ShippingDocumentInput,
  ): Promise<ShippingDocumentResponse> {
    const order = await this.prisma.exportOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: input.exportOrderId }) as { tenantId: string; id: string },
    });
    if (!order) throw new NotFoundException('Export order not found');

    const docId = uuidv4();

    await this.prisma.shippingDocument.create({
      data: {
        id: docId,
        tenantId,
        exportOrderId: input.exportOrderId,
        documentType: input.documentType,
        documentNumber: input.documentNumber ?? null,
        issuedDate: input.issuedDate ?? null,
        expiryDate: input.expiryDate ?? null,
        fileUrl: input.fileUrl ?? null,
        status: 'DRAFT',
        notes: input.notes ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.getDocument(tenantId, docId);
  }

  // ─── Get Document ───────────────────────────────────────────────

  async getDocument(tenantId: string, docId: string): Promise<ShippingDocumentResponse> {
    const doc = await this.prisma.shippingDocument.findFirst({
      where: this.tenantWhere(tenantId, { id: docId }) as { tenantId: string; id: string },
      include: {
        exportOrder: { select: { orderNumber: true } },
      },
    });
    if (!doc) throw new NotFoundException('Shipping document not found');
    return this.mapDocToResponse(doc);
  }

  // ─── List Documents ─────────────────────────────────────────────

  async listDocuments(
    tenantId: string,
    filters: {
      exportOrderId?: string;
      documentType?: ShippingDocumentType;
      status?: ShippingDocumentStatus;
    },
    pagination: Pagination,
  ): Promise<PaginatedResult<ShippingDocumentResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.exportOrderId) where.exportOrderId = filters.exportOrderId;
    if (filters.documentType) where.documentType = filters.documentType;
    if (filters.status) where.status = filters.status;

    const [items, total] = await Promise.all([
      this.prisma.shippingDocument.findMany({
        where,
        include: {
          exportOrder: { select: { orderNumber: true } },
        },
        orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.shippingDocument.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((d) => this.mapDocToResponse(d)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  // ─── Update Document Status ─────────────────────────────────────

  async updateDocumentStatus(
    tenantId: string,
    userId: string,
    docId: string,
    newStatus: ShippingDocumentStatus,
  ): Promise<ShippingDocumentResponse> {
    const doc = await this.prisma.shippingDocument.findFirst({
      where: this.tenantWhere(tenantId, { id: docId }) as { tenantId: string; id: string },
    });
    if (!doc) throw new NotFoundException('Shipping document not found');

    await this.prisma.shippingDocument.update({
      where: { id: docId },
      data: {
        status: newStatus,
        issuedDate: newStatus === 'ISSUED' && !doc.issuedDate ? new Date() : undefined,
        updatedBy: userId,
      },
    });

    if (newStatus === 'ISSUED') {
      await this.eventBus.publish({
        id: uuidv4(),
        tenantId,
        userId,
        timestamp: new Date().toISOString(),
        type: 'export.document.issued',
        payload: {
          documentId: docId,
          documentType: doc.documentType,
          exportOrderId: doc.exportOrderId,
        },
      });
    }

    return this.getDocument(tenantId, docId);
  }

  // ─── Generate Packing List ──────────────────────────────────────

  async generatePackingList(tenantId: string, exportOrderId: string): Promise<PackingListData> {
    const order = await this.prisma.exportOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: exportOrderId }) as { tenantId: string; id: string },
      include: {
        items: true,
        buyer: { select: { firstName: true, lastName: true, address: true, city: true, country: true } },
      },
    });
    if (!order) throw new NotFoundException('Export order not found');

    const buyer = order.buyer as Record<string, unknown>;
    const buyerAddress = [buyer.address, buyer.city, buyer.country].filter(Boolean).join(', ');

    const items = (order.items as Array<Record<string, unknown>>).map((item) => ({
      description: item.description as string,
      quantity: item.quantity as number,
      grossWeightMg: Number(item.weightMg),
      netWeightMg: Math.round(Number(item.weightMg) * 0.95), // ~5% packaging
      hsCode: item.hsCode as string,
    }));

    const totalGrossWeightMg = items.reduce((sum, i) => sum + i.grossWeightMg, 0);
    const totalNetWeightMg = items.reduce((sum, i) => sum + i.netWeightMg, 0);

    return {
      exportOrderId,
      orderNumber: order.orderNumber,
      buyerName: `${buyer.firstName as string} ${buyer.lastName as string}`,
      buyerAddress,
      items,
      totalGrossWeightMg,
      totalNetWeightMg,
      totalPackages: items.length,
    };
  }

  // ─── Generate Shipping Bill Data ────────────────────────────────

  async generateShippingBillData(tenantId: string, invoiceId: string): Promise<ShippingBillData> {
    const invoice = await this.prisma.exportInvoice.findFirst({
      where: this.tenantWhere(tenantId, { id: invoiceId }) as { tenantId: string; id: string },
      include: {
        items: true,
        buyer: { select: { firstName: true, lastName: true, country: true } },
        exportOrder: { select: { buyerCountry: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Export invoice not found');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const buyer = invoice.buyer as Record<string, unknown>;
    const items = (invoice.items as Array<Record<string, unknown>>).map((item) => ({
      description: item.description as string,
      hsCode: item.hsCode as string,
      quantity: item.quantity as number,
      valuePaise: Number(item.totalPricePaise),
      weightMg: Number(item.weightMg),
      countryOfOrigin: item.countryOfOrigin as string,
    }));

    const totalFobValuePaise = items.reduce((sum, i) => sum + i.valuePaise, 0);

    return {
      exporterName: tenant?.name ?? '',
      ieCode: invoice.ieCode,
      adCode: invoice.adCode ?? '',
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: new Date(invoice.createdAt).toISOString(),
      buyerName: `${buyer.firstName as string} ${buyer.lastName as string}`,
      buyerCountry: (invoice.exportOrder as Record<string, unknown>).buyerCountry as string,
      portOfLoading: invoice.portOfLoading ?? '',
      portOfDischarge: invoice.portOfDischarge ?? '',
      items,
      totalFobValuePaise,
      currencyCode: invoice.currencyCode,
      exchangeRate: invoice.exchangeRate,
    };
  }

  // ─── Generate Certificate of Origin ─────────────────────────────

  async generateCertificateOfOrigin(
    tenantId: string,
    exportOrderId: string,
  ): Promise<CertificateOfOriginData> {
    const order = await this.prisma.exportOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: exportOrderId }) as { tenantId: string; id: string },
      include: {
        items: true,
        buyer: { select: { firstName: true, lastName: true, address: true, city: true, country: true } },
        invoices: {
          where: { invoiceType: 'COMMERCIAL' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!order) throw new NotFoundException('Export order not found');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const buyer = order.buyer as Record<string, unknown>;
    const invoices = order.invoices as Array<Record<string, unknown>>;
    const latestInvoice = invoices[0];

    const items = (order.items as Array<Record<string, unknown>>).map((item) => ({
      description: item.description as string,
      hsCode: item.hsCode as string,
      quantity: item.quantity as number,
      weightMg: Number(item.weightMg),
      countryOfOrigin: item.countryOfOrigin as string,
    }));

    const buyerAddress = [buyer.address, buyer.city, buyer.country].filter(Boolean).join(', ');

    return {
      exporterName: tenant?.name ?? '',
      exporterAddress: '', // Would come from tenant settings in production
      consigneeName: `${buyer.firstName as string} ${buyer.lastName as string}`,
      consigneeAddress: buyerAddress,
      consigneeCountry: order.buyerCountry,
      transportDetails: order.incoterms,
      portOfLoading: latestInvoice?.portOfLoading as string ?? '',
      portOfDischarge: latestInvoice?.portOfDischarge as string ?? '',
      items,
      invoiceNumber: latestInvoice?.invoiceNumber as string ?? '',
      invoiceDate: latestInvoice ? new Date(latestInvoice.createdAt as string).toISOString() : '',
    };
  }

  // ─── Mapper ─────────────────────────────────────────────────────

  private mapDocToResponse(doc: Record<string, unknown>): ShippingDocumentResponse {
    const d = doc as Record<string, unknown>;
    const exportOrder = d.exportOrder as Record<string, unknown> | undefined;

    return {
      id: d.id as string,
      tenantId: d.tenantId as string,
      exportOrderId: d.exportOrderId as string,
      orderNumber: exportOrder?.orderNumber as string | undefined,
      documentType: d.documentType as ShippingDocumentType,
      documentNumber: (d.documentNumber as string) ?? null,
      issuedDate: d.issuedDate ? new Date(d.issuedDate as string).toISOString() : null,
      expiryDate: d.expiryDate ? new Date(d.expiryDate as string).toISOString() : null,
      fileUrl: (d.fileUrl as string) ?? null,
      status: d.status as ShippingDocumentStatus,
      notes: (d.notes as string) ?? null,
      createdAt: new Date(d.createdAt as string).toISOString(),
      updatedAt: new Date(d.updatedAt as string).toISOString(),
    };
  }
}
