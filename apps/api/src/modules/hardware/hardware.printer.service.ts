// ─── Hardware Label Printer Service ───────────────────────────
// Label template management, print data generation, bulk printing.

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  CreateLabelTemplate,
  UpdateLabelTemplate,
  LabelTemplateResponse,
  PrintLabelRequest,
  PrintBulkLabelRequest,
  PrintPreviewResponse,
  LabelField,
} from '@caratflow/shared-types';
import type { PaginatedResult } from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

/** Setting key prefix for label templates */
const TEMPLATE_SETTING_CATEGORY = 'hardware';
const TEMPLATE_KEY_PREFIX = 'label-template:';

@Injectable()
export class HardwarePrinterService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Template Management ────────────────────────────────────

  /**
   * Create a label template.
   */
  async createTemplate(
    tenantId: string,
    userId: string,
    input: CreateLabelTemplate,
  ): Promise<LabelTemplateResponse> {
    const templateId = uuid();
    const now = new Date();

    const template: LabelTemplateResponse = {
      id: templateId,
      tenantId,
      name: input.name,
      width: input.width,
      height: input.height,
      fields: input.fields,
      createdAt: now,
      updatedAt: now,
    };

    await this.prisma.setting.create({
      data: {
        id: uuid(),
        tenantId,
        category: TEMPLATE_SETTING_CATEGORY,
        key: `${TEMPLATE_KEY_PREFIX}${templateId}`,
        value: JSON.stringify(template),
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return template;
  }

  /**
   * List all label templates for a tenant.
   */
  async listTemplates(tenantId: string): Promise<LabelTemplateResponse[]> {
    const settings = await this.prisma.setting.findMany({
      where: {
        tenantId,
        category: TEMPLATE_SETTING_CATEGORY,
        key: { startsWith: TEMPLATE_KEY_PREFIX },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return settings.map((s) => JSON.parse(s.value as string) as LabelTemplateResponse);
  }

  /**
   * Get a single template by ID.
   */
  async getTemplate(tenantId: string, templateId: string): Promise<LabelTemplateResponse> {
    const setting = await this.prisma.setting.findFirst({
      where: {
        tenantId,
        category: TEMPLATE_SETTING_CATEGORY,
        key: `${TEMPLATE_KEY_PREFIX}${templateId}`,
      },
    });

    if (!setting) {
      throw new NotFoundException(`Label template ${templateId} not found`);
    }

    return JSON.parse(setting.value as string) as LabelTemplateResponse;
  }

  /**
   * Update a label template.
   */
  async updateTemplate(
    tenantId: string,
    userId: string,
    templateId: string,
    input: UpdateLabelTemplate,
  ): Promise<LabelTemplateResponse> {
    const existing = await this.getTemplate(tenantId, templateId);

    const updated: LabelTemplateResponse = {
      ...existing,
      ...input,
      id: templateId,
      tenantId,
      updatedAt: new Date(),
    };

    await this.prisma.setting.updateMany({
      where: {
        tenantId,
        category: TEMPLATE_SETTING_CATEGORY,
        key: `${TEMPLATE_KEY_PREFIX}${templateId}`,
      },
      data: {
        value: JSON.stringify(updated),
        updatedBy: userId,
      },
    });

    return updated;
  }

  /**
   * Delete a label template.
   */
  async deleteTemplate(tenantId: string, templateId: string): Promise<void> {
    const setting = await this.prisma.setting.findFirst({
      where: {
        tenantId,
        category: TEMPLATE_SETTING_CATEGORY,
        key: `${TEMPLATE_KEY_PREFIX}${templateId}`,
      },
    });

    if (!setting) {
      throw new NotFoundException(`Label template ${templateId} not found`);
    }

    await this.prisma.setting.delete({
      where: { id: setting.id },
    });
  }

  // ─── Print Operations ───────────────────────────────────────

  /**
   * Generate print data from template + product data (populate fields).
   * Returns rendered field data that can be sent to the printer.
   */
  async generatePrintData(
    tenantId: string,
    input: PrintLabelRequest,
  ): Promise<PrintPreviewResponse> {
    const template = await this.getTemplate(tenantId, input.templateId);

    const renderedFields = template.fields.map((field) => ({
      ...field,
      resolvedValue: this.resolveFieldValue(field, input.data),
    }));

    return {
      templateId: template.id,
      templateName: template.name,
      width: template.width,
      height: template.height,
      renderedFields,
    };
  }

  /**
   * Generate print preview with product data filled in.
   */
  async preview(
    tenantId: string,
    templateId: string,
    data: Record<string, string>,
  ): Promise<PrintPreviewResponse> {
    const template = await this.getTemplate(tenantId, templateId);

    const renderedFields = template.fields.map((field) => ({
      ...field,
      resolvedValue: this.resolveFieldValue(field, data),
    }));

    return {
      templateId: template.id,
      templateName: template.name,
      width: template.width,
      height: template.height,
      renderedFields,
    };
  }

  /**
   * Bulk print: generate labels for multiple products.
   * Returns an array of rendered print data for each item.
   */
  async generateBulkPrintData(
    tenantId: string,
    input: PrintBulkLabelRequest,
  ): Promise<PrintPreviewResponse[]> {
    const template = await this.getTemplate(tenantId, input.templateId);

    return input.items.map((item) => ({
      templateId: template.id,
      templateName: template.name,
      width: template.width,
      height: template.height,
      renderedFields: template.fields.map((field) => ({
        ...field,
        resolvedValue: this.resolveFieldValue(field, item.data),
      })),
    }));
  }

  /**
   * Generate a standard jewelry label for a product.
   * Fetches product data and populates standard jewelry label fields.
   */
  async generateJewelryLabel(
    tenantId: string,
    templateId: string,
    productId: string,
  ): Promise<PrintPreviewResponse> {
    const product = await this.prisma.product.findFirst({
      where: this.tenantWhere(tenantId, { id: productId }),
      select: {
        sku: true,
        name: true,
        grossWeightMg: true,
        netWeightMg: true,
        purityFineness: true,
        huid: true,
        sellingPricePaise: true,
        barcode: true,
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
      purity: product.purityFineness
        ? this.formatPurity(product.purityFineness)
        : '',
      huid: product.huid ?? '',
      price: product.sellingPricePaise
        ? this.formatPrice(Number(product.sellingPricePaise))
        : '',
      barcode: product.barcode ?? product.sku,
      qrCode: JSON.stringify({
        sku: product.sku,
        huid: product.huid,
        wt: product.grossWeightMg ? Number(product.grossWeightMg) : undefined,
      }),
    };

    return this.preview(tenantId, templateId, data);
  }

  /**
   * Generate ZPL (Zebra Programming Language) placeholder for label.
   * This is a simplified placeholder; real implementation would build full ZPL.
   */
  generateZpl(preview: PrintPreviewResponse): string {
    const lines: string[] = [`^XA`, `^PW${Math.round(preview.width * 8)}`, `^LL${Math.round(preview.height * 8)}`];

    for (const field of preview.renderedFields) {
      const x = Math.round(field.x * 8);
      const y = Math.round(field.y * 8);

      switch (field.type) {
        case 'text':
          lines.push(`^FO${x},${y}^A0N,${field.fontSize ?? 24},${field.fontSize ?? 24}^FD${field.resolvedValue}^FS`);
          break;
        case 'barcode':
          lines.push(`^FO${x},${y}^BCN,${Math.round(field.height * 8)},Y,N,N^FD${field.resolvedValue}^FS`);
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

  // ─── Private Helpers ────────────────────────────────────────

  /**
   * Resolve a field's value using the provided data map.
   * Field value can contain placeholders like {{sku}}, {{productName}}, etc.
   */
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
