// ─── Hardware Label Printer Service ───────────────────────────
// Label template CRUD plus ZPL/TSPL command generation for
// jewelry tags. Templates live in the dedicated
// `HardwareLabelTemplate` table. Actual transmission to the
// printer is the responsibility of a local print agent that
// picks up the raw command string returned by these endpoints.

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type {
  CreateLabelTemplate,
  UpdateLabelTemplate,
  LabelTemplateResponse,
  PrintLabelRequest,
  PrintBulkLabelRequest,
  PrintPreviewResponse,
  LabelField,
  LabelPrintCommandResponse,
} from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

interface TemplateRow {
  id: string;
  tenantId: string;
  name: string;
  width: number;
  height: number;
  fields: unknown;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class HardwarePrinterService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── Template Management ────────────────────────────────────

  private toResponse(row: TemplateRow): LabelTemplateResponse {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      width: row.width,
      height: row.height,
      fields: (row.fields as LabelField[]) ?? [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createTemplate(
    tenantId: string,
    userId: string,
    input: CreateLabelTemplate,
  ): Promise<LabelTemplateResponse> {
    const created = (await this.prisma.hardwareLabelTemplate.create({
      data: {
        id: uuid(),
        tenantId,
        name: input.name,
        width: input.width,
        height: input.height,
        fields: input.fields as unknown as object,
        createdBy: userId,
        updatedBy: userId,
      },
    })) as unknown as TemplateRow;
    return this.toResponse(created);
  }

  async listTemplates(tenantId: string): Promise<LabelTemplateResponse[]> {
    const rows = (await this.prisma.hardwareLabelTemplate.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
    })) as unknown as TemplateRow[];
    return rows.map((r) => this.toResponse(r));
  }

  async getTemplate(tenantId: string, templateId: string): Promise<LabelTemplateResponse> {
    const row = await this.prisma.hardwareLabelTemplate.findFirst({
      where: { tenantId, id: templateId },
    });
    if (!row) throw new NotFoundException(`Label template ${templateId} not found`);
    return this.toResponse(row as unknown as TemplateRow);
  }

  async updateTemplate(
    tenantId: string,
    userId: string,
    templateId: string,
    input: UpdateLabelTemplate,
  ): Promise<LabelTemplateResponse> {
    await this.getTemplate(tenantId, templateId);
    const data: Record<string, unknown> = { updatedBy: userId };
    if (input.name !== undefined) data.name = input.name;
    if (input.width !== undefined) data.width = input.width;
    if (input.height !== undefined) data.height = input.height;
    if (input.fields !== undefined) data.fields = input.fields as unknown as object;

    const updated = (await this.prisma.hardwareLabelTemplate.update({
      where: { id: templateId },
      data: data as never,
    })) as unknown as TemplateRow;
    return this.toResponse(updated);
  }

  async deleteTemplate(tenantId: string, templateId: string): Promise<void> {
    await this.getTemplate(tenantId, templateId);
    await this.prisma.hardwareLabelTemplate.delete({ where: { id: templateId } });
  }

  // ─── Print Operations ───────────────────────────────────────

  async generatePrintData(
    tenantId: string,
    input: PrintLabelRequest,
  ): Promise<PrintPreviewResponse> {
    const template = await this.getTemplate(tenantId, input.templateId);
    return this.renderTemplate(template, input.data);
  }

  async preview(
    tenantId: string,
    templateId: string,
    data: Record<string, string>,
  ): Promise<PrintPreviewResponse> {
    const template = await this.getTemplate(tenantId, templateId);
    return this.renderTemplate(template, data);
  }

  async generateBulkPrintData(
    tenantId: string,
    input: PrintBulkLabelRequest,
  ): Promise<PrintPreviewResponse[]> {
    const template = await this.getTemplate(tenantId, input.templateId);
    return input.items.map((item) => this.renderTemplate(template, item.data));
  }

  /**
   * Build a ready-to-print ZPL or TSPL command stream for a
   * specific product. Used by POST /api/v1/hardware/label/print.
   */
  async printJewelryLabel(
    tenantId: string,
    templateId: string,
    productId: string,
    copies: number,
    language: 'ZPL' | 'TSPL',
  ): Promise<LabelPrintCommandResponse> {
    const preview = await this.generateJewelryLabel(tenantId, templateId, productId);
    const command =
      language === 'TSPL' ? this.generateTspl(preview, copies) : this.generateZpl(preview, copies);

    await this.eventBus.publish({
      id: uuid(),
      type: 'hardware.label.printed',
      tenantId,
      userId: 'system',
      timestamp: new Date().toISOString(),
      payload: { templateId, productId, copies },
    });

    return {
      productId,
      templateId,
      printerLanguage: language,
      command,
      copies,
    };
  }

  async generateJewelryLabel(
    tenantId: string,
    templateId: string,
    productId: string,
  ): Promise<PrintPreviewResponse> {
    const product = await this.prisma.product.findFirst({
      where: { tenantId, id: productId },
      select: {
        sku: true,
        name: true,
        grossWeightMg: true,
        netWeightMg: true,
        metalPurity: true,
        huidNumber: true,
        sellingPricePaise: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const data: Record<string, string> = {
      sku: product.sku,
      productName: product.name,
      grossWeight: product.grossWeightMg
        ? `${(Number(product.grossWeightMg) / 1000).toFixed(3)}g`
        : '',
      netWeight: product.netWeightMg
        ? `${(Number(product.netWeightMg) / 1000).toFixed(3)}g`
        : '',
      purity: product.metalPurity ? this.formatPurity(product.metalPurity) : '',
      huid: product.huidNumber ?? '',
      price: product.sellingPricePaise
        ? this.formatPrice(Number(product.sellingPricePaise))
        : '',
      barcode: product.sku,
      qrCode: JSON.stringify({
        sku: product.sku,
        huid: product.huidNumber,
        wt: product.grossWeightMg ? Number(product.grossWeightMg) : undefined,
      }),
    };

    return this.preview(tenantId, templateId, data);
  }

  /**
   * Build a ZPL command string for the rendered label.
   */
  generateZpl(preview: PrintPreviewResponse, copies = 1): string {
    const lines: string[] = [
      `^XA`,
      `^PW${Math.round(preview.width * 8)}`,
      `^LL${Math.round(preview.height * 8)}`,
      `^PQ${copies}`,
    ];

    for (const field of preview.renderedFields) {
      const x = Math.round(field.x * 8);
      const y = Math.round(field.y * 8);

      switch (field.type) {
        case 'text':
          lines.push(
            `^FO${x},${y}^A0N,${field.fontSize ?? 24},${field.fontSize ?? 24}^FD${field.resolvedValue}^FS`,
          );
          break;
        case 'barcode':
          lines.push(
            `^FO${x},${y}^BCN,${Math.round(field.height * 8)},Y,N,N^FD${field.resolvedValue}^FS`,
          );
          break;
        case 'qr':
          lines.push(`^FO${x},${y}^BQN,2,5^FDHA,${field.resolvedValue}^FS`);
          break;
        default:
          break;
      }
    }

    lines.push(`^XZ`);
    return lines.join('\n');
  }

  /**
   * Build a TSPL command string for the rendered label.
   */
  generateTspl(preview: PrintPreviewResponse, copies = 1): string {
    const out: string[] = [
      `SIZE ${preview.width} mm,${preview.height} mm`,
      `GAP 2 mm,0`,
      `CLS`,
    ];

    for (const field of preview.renderedFields) {
      const x = Math.round(field.x * 8);
      const y = Math.round(field.y * 8);
      const value = field.resolvedValue.replace(/"/g, '\\"');

      switch (field.type) {
        case 'text':
          out.push(`TEXT ${x},${y},"3",0,1,1,"${value}"`);
          break;
        case 'barcode':
          out.push(`BARCODE ${x},${y},"128",${Math.round(field.height * 8)},1,0,2,2,"${value}"`);
          break;
        case 'qr':
          out.push(`QRCODE ${x},${y},M,5,A,0,"${value}"`);
          break;
        default:
          break;
      }
    }

    out.push(`PRINT ${copies},1`);
    return out.join('\r\n');
  }

  // ─── Private Helpers ────────────────────────────────────────

  private renderTemplate(
    template: LabelTemplateResponse,
    data: Record<string, string>,
  ): PrintPreviewResponse {
    return {
      templateId: template.id,
      templateName: template.name,
      width: template.width,
      height: template.height,
      renderedFields: template.fields.map((field) => ({
        ...field,
        resolvedValue: this.resolveFieldValue(field, data),
      })),
    };
  }

  private resolveFieldValue(field: LabelField, data: Record<string, string>): string {
    let resolved = field.value;
    for (const [key, value] of Object.entries(data)) {
      resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return resolved;
  }

  private formatPurity(fineness: number): string {
    const karatMap: Record<number, string> = {
      999: '24K (999)',
      916: '22K (916)',
      750: '18K (750)',
      585: '14K (585)',
    };
    return karatMap[fineness] ?? `${fineness}`;
  }

  private formatPrice(paise: number): string {
    const rupees = paise / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(rupees);
  }
}
