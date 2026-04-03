// ─── Export Compliance Service ────────────────────────────────────
// Compliance check: given destination + products, return requirements
// (hallmark needed?, certificate needed?, restricted?).
// Country-specific rules.

import { Injectable } from '@nestjs/common';
import type { ExportComplianceCheck, ExportComplianceResult } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';

@Injectable()
export class ExportComplianceService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Check Compliance ───────────────────────────────────────────

  async checkCompliance(input: ExportComplianceCheck): Promise<ExportComplianceResult[]> {
    const results: ExportComplianceResult[] = [];

    for (const category of input.productCategories) {
      const rule = await this.prisma.exportCompliance.findUnique({
        where: {
          destinationCountry_productCategory: {
            destinationCountry: input.destinationCountry,
            productCategory: category,
          },
        },
      });

      if (rule) {
        results.push({
          destinationCountry: rule.destinationCountry,
          productCategory: rule.productCategory,
          requiresHallmark: rule.requiresHallmark,
          requiresCertificate: rule.requiresCertificate,
          restrictedItems: (rule.restrictedItems as Record<string, unknown>[]) ?? [],
          dutyExemptions: (rule.dutyExemptions as Record<string, unknown>[]) ?? [],
          notes: rule.notes,
        });
      } else {
        // Return default (no specific restrictions found)
        results.push({
          destinationCountry: input.destinationCountry,
          productCategory: category,
          requiresHallmark: false,
          requiresCertificate: false,
          restrictedItems: [],
          dutyExemptions: [],
          notes: 'No specific compliance rules found for this destination/category combination',
        });
      }
    }

    return results;
  }

  // ─── List Compliance Rules ──────────────────────────────────────

  async listComplianceRules(
    filters: { destinationCountry?: string },
  ): Promise<ExportComplianceResult[]> {
    const where: Record<string, unknown> = {};
    if (filters.destinationCountry) where.destinationCountry = filters.destinationCountry;

    const rules = await this.prisma.exportCompliance.findMany({
      where,
      orderBy: [{ destinationCountry: 'asc' }, { productCategory: 'asc' }],
    });

    return rules.map((rule) => ({
      destinationCountry: rule.destinationCountry,
      productCategory: rule.productCategory,
      requiresHallmark: rule.requiresHallmark,
      requiresCertificate: rule.requiresCertificate,
      restrictedItems: (rule.restrictedItems as Record<string, unknown>[]) ?? [],
      dutyExemptions: (rule.dutyExemptions as Record<string, unknown>[]) ?? [],
      notes: rule.notes,
    }));
  }

  // ─── Check Export Readiness ─────────────────────────────────────
  // Validates whether an export order has all required compliance checks

  async checkExportReadiness(
    tenantId: string,
    exportOrderId: string,
  ): Promise<{
    isReady: boolean;
    missing: string[];
    warnings: string[];
  }> {
    const order = await this.prisma.exportOrder.findFirst({
      where: { tenantId, id: exportOrderId },
      include: {
        items: true,
        shippingDocuments: true,
      },
    });

    if (!order) {
      return { isReady: false, missing: ['Export order not found'], warnings: [] };
    }

    const missing: string[] = [];
    const warnings: string[] = [];

    // Check if commercial invoice exists
    const commercialInvoice = await this.prisma.exportInvoice.findFirst({
      where: { tenantId, exportOrderId, invoiceType: 'COMMERCIAL' },
    });
    if (!commercialInvoice) {
      missing.push('Commercial invoice required');
    }

    // Check required shipping documents
    const docs = order.shippingDocuments as Array<Record<string, unknown>>;
    const docTypes = docs.map((d) => d.documentType as string);

    if (!docTypes.includes('PACKING_LIST')) {
      missing.push('Packing list required');
    }
    if (!docTypes.includes('SHIPPING_BILL')) {
      missing.push('Shipping bill required');
    }

    // Check country-specific compliance requirements
    const items = order.items as Array<Record<string, unknown>>;
    const uniqueHsChapters = [...new Set(items.map((i) => (i.hsCode as string).substring(0, 2)))];

    for (const chapter of uniqueHsChapters) {
      const complianceRule = await this.prisma.exportCompliance.findUnique({
        where: {
          destinationCountry_productCategory: {
            destinationCountry: order.buyerCountry,
            productCategory: chapter,
          },
        },
      });

      if (complianceRule) {
        if (complianceRule.requiresCertificate && !docTypes.includes('CERTIFICATE_OF_ORIGIN')) {
          missing.push(`Certificate of Origin required for ${order.buyerCountry} (chapter ${chapter})`);
        }
        if (complianceRule.requiresHallmark) {
          warnings.push(`Hallmark verification may be required for chapter ${chapter} items`);
        }
      }
    }

    return {
      isReady: missing.length === 0,
      missing,
      warnings,
    };
  }
}
