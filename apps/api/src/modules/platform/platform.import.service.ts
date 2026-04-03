import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type { AuditMeta } from '@caratflow/shared-types';

type ImportEntityType = 'customer' | 'product' | 'supplier';

interface ImportError {
  row: number;
  field: string;
  error: string;
}

interface ColumnMapping {
  [csvHeader: string]: string; // maps CSV column name to entity field
}

/** Expected fields per entity type. */
const ENTITY_FIELDS: Record<ImportEntityType, string[]> = {
  customer: [
    'firstName', 'lastName', 'email', 'phone', 'alternatePhone',
    'address', 'city', 'state', 'country', 'postalCode',
    'customerType', 'panNumber', 'aadhaarNumber', 'gstinNumber',
    'dateOfBirth', 'anniversary', 'notes',
  ],
  product: [
    'sku', 'name', 'description', 'productType', 'metalPurity',
    'metalWeightMg', 'grossWeightMg', 'netWeightMg', 'stoneWeightCt',
    'makingCharges', 'wastagePercent', 'huidNumber', 'hallmarkNumber',
    'costPricePaise', 'sellingPricePaise', 'currencyCode',
  ],
  supplier: [
    'name', 'contactPerson', 'email', 'phone', 'address',
    'city', 'state', 'country', 'postalCode',
    'gstinNumber', 'panNumber', 'supplierType',
  ],
};

@Injectable()
export class PlatformImportService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /** Get available fields for an entity type (for column mapping UI). */
  getEntityFields(entityType: ImportEntityType): string[] {
    const fields = ENTITY_FIELDS[entityType];
    if (!fields) {
      throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }
    return fields;
  }

  /** Create an import job after file upload. */
  async createImportJob(
    tenantId: string,
    input: {
      fileName: string;
      fileUrl?: string;
      entityType: ImportEntityType;
      totalRows: number;
      columnMapping: ColumnMapping;
    },
    audit: AuditMeta,
  ) {
    return this.prisma.importJob.create({
      data: {
        id: uuid(),
        tenantId,
        fileName: input.fileName,
        fileUrl: input.fileUrl ?? null,
        entityType: input.entityType,
        status: 'PENDING',
        totalRows: input.totalRows,
        columnMapping: input.columnMapping,
        createdBy: audit.userId,
      },
    });
  }

  /** Process an import job. Parses rows and batch-upserts into the target table. */
  async processImport(
    tenantId: string,
    importJobId: string,
    rows: Record<string, unknown>[],
    audit: AuditMeta,
  ) {
    const job = await this.prisma.importJob.findFirst({
      where: this.tenantWhere(tenantId, { id: importJobId }),
    });
    if (!job) {
      throw new NotFoundException('Import job not found');
    }
    if (job.status !== 'PENDING') {
      throw new BadRequestException('Import job has already been processed');
    }

    // Mark as processing
    await this.prisma.importJob.update({
      where: { id: importJobId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    const entityType = job.entityType as ImportEntityType;
    const mapping = (job.columnMapping as ColumnMapping) ?? {};
    const errors: ImportError[] = [];
    let successCount = 0;
    let processedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      processedCount++;
      const rawRow = rows[i];
      try {
        // Apply column mapping
        const mapped = this.applyMapping(rawRow, mapping);

        // Validate row
        const rowErrors = this.validateRow(entityType, mapped, i + 1);
        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          continue;
        }

        // Insert/upsert based on entity type
        await this.upsertRow(tenantId, entityType, mapped, audit);
        successCount++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ row: i + 1, field: '_general', error: message });
      }

      // Update progress every 50 rows
      if (processedCount % 50 === 0) {
        await this.prisma.importJob.update({
          where: { id: importJobId },
          data: { processedRows: processedCount, successRows: successCount, errorRows: errors.length },
        });
      }
    }

    // Finalize
    const finalStatus = errors.length === rows.length ? 'FAILED' : 'COMPLETED';
    await this.prisma.importJob.update({
      where: { id: importJobId },
      data: {
        status: finalStatus,
        processedRows: processedCount,
        successRows: successCount,
        errorRows: errors.length,
        errors: errors as unknown as Record<string, unknown>[],
        completedAt: new Date(),
      },
    });

    return {
      jobId: importJobId,
      status: finalStatus,
      totalRows: rows.length,
      successRows: successCount,
      errorRows: errors.length,
      errors: errors.slice(0, 100), // Return first 100 errors
    };
  }

  /** Get import job status and details. */
  async getImportJob(tenantId: string, jobId: string) {
    const job = await this.prisma.importJob.findFirst({
      where: this.tenantWhere(tenantId, { id: jobId }),
    });
    if (!job) {
      throw new NotFoundException('Import job not found');
    }
    return job;
  }

  /** List import jobs for a tenant. */
  async listImportJobs(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.importJob.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.importJob.count({ where: { tenantId } }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private applyMapping(row: Record<string, unknown>, mapping: ColumnMapping): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [csvCol, entityField] of Object.entries(mapping)) {
      if (row[csvCol] !== undefined) {
        result[entityField] = row[csvCol];
      }
    }
    // Also include any direct field mappings (unmapped columns with matching names)
    for (const [key, value] of Object.entries(row)) {
      if (!mapping[key] && value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  private validateRow(entityType: ImportEntityType, row: Record<string, unknown>, rowNum: number): ImportError[] {
    const errors: ImportError[] = [];

    switch (entityType) {
      case 'customer':
        if (!row.firstName) errors.push({ row: rowNum, field: 'firstName', error: 'First name is required' });
        if (!row.lastName) errors.push({ row: rowNum, field: 'lastName', error: 'Last name is required' });
        break;
      case 'product':
        if (!row.sku) errors.push({ row: rowNum, field: 'sku', error: 'SKU is required' });
        if (!row.name) errors.push({ row: rowNum, field: 'name', error: 'Product name is required' });
        if (!row.productType) errors.push({ row: rowNum, field: 'productType', error: 'Product type is required' });
        break;
      case 'supplier':
        if (!row.name) errors.push({ row: rowNum, field: 'name', error: 'Supplier name is required' });
        break;
    }

    return errors;
  }

  private async upsertRow(
    tenantId: string,
    entityType: ImportEntityType,
    row: Record<string, unknown>,
    audit: AuditMeta,
  ) {
    switch (entityType) {
      case 'customer':
        return this.upsertCustomer(tenantId, row, audit);
      case 'product':
        return this.upsertProduct(tenantId, row, audit);
      case 'supplier':
        return this.upsertSupplier(tenantId, row, audit);
      default:
        throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }
  }

  private async upsertCustomer(tenantId: string, row: Record<string, unknown>, audit: AuditMeta) {
    const email = row.email as string | undefined;
    const phone = row.phone as string | undefined;

    // Try to find existing customer by email or phone
    if (email) {
      const existing = await this.prisma.customer.findFirst({
        where: { tenantId, email },
      });
      if (existing) {
        return this.prisma.customer.update({
          where: { id: existing.id },
          data: { ...this.cleanRow(row), updatedBy: audit.userId },
        });
      }
    }

    return this.prisma.customer.create({
      data: {
        id: uuid(),
        tenantId,
        firstName: (row.firstName as string) ?? '',
        lastName: (row.lastName as string) ?? '',
        email: email ?? null,
        phone: phone ?? null,
        alternatePhone: (row.alternatePhone as string) ?? null,
        address: (row.address as string) ?? null,
        city: (row.city as string) ?? null,
        state: (row.state as string) ?? null,
        country: (row.country as string) ?? null,
        postalCode: (row.postalCode as string) ?? null,
        customerType: (row.customerType as 'RETAIL' | 'WHOLESALE' | 'CORPORATE') ?? 'RETAIL',
        panNumber: (row.panNumber as string) ?? null,
        gstinNumber: (row.gstinNumber as string) ?? null,
        notes: (row.notes as string) ?? null,
        createdBy: audit.userId,
      },
    });
  }

  private async upsertProduct(tenantId: string, row: Record<string, unknown>, audit: AuditMeta) {
    const sku = row.sku as string;
    const existing = await this.prisma.product.findUnique({
      where: { tenantId_sku: { tenantId, sku } },
    });

    const data = {
      name: (row.name as string) ?? '',
      productType: (row.productType as string) ?? 'OTHER',
      description: (row.description as string) ?? null,
      metalPurity: row.metalPurity ? Number(row.metalPurity) : null,
      metalWeightMg: row.metalWeightMg ? BigInt(Number(row.metalWeightMg)) : null,
      grossWeightMg: row.grossWeightMg ? BigInt(Number(row.grossWeightMg)) : null,
      netWeightMg: row.netWeightMg ? BigInt(Number(row.netWeightMg)) : null,
      stoneWeightCt: row.stoneWeightCt ? Number(row.stoneWeightCt) : null,
      huidNumber: (row.huidNumber as string) ?? null,
      hallmarkNumber: (row.hallmarkNumber as string) ?? null,
      costPricePaise: row.costPricePaise ? BigInt(Number(row.costPricePaise)) : null,
      sellingPricePaise: row.sellingPricePaise ? BigInt(Number(row.sellingPricePaise)) : null,
      currencyCode: (row.currencyCode as string) ?? 'INR',
    };

    if (existing) {
      return this.prisma.product.update({
        where: { id: existing.id },
        data: { ...data, updatedBy: audit.userId },
      });
    }

    return this.prisma.product.create({
      data: {
        id: uuid(),
        tenantId,
        sku,
        ...data,
        createdBy: audit.userId,
      },
    });
  }

  private async upsertSupplier(tenantId: string, row: Record<string, unknown>, audit: AuditMeta) {
    const name = row.name as string;
    const existing = await this.prisma.supplier.findFirst({
      where: { tenantId, name },
    });

    const data = {
      contactPerson: (row.contactPerson as string) ?? null,
      email: (row.email as string) ?? null,
      phone: (row.phone as string) ?? null,
      address: (row.address as string) ?? null,
      city: (row.city as string) ?? null,
      state: (row.state as string) ?? null,
      country: (row.country as string) ?? null,
      postalCode: (row.postalCode as string) ?? null,
      gstinNumber: (row.gstinNumber as string) ?? null,
      panNumber: (row.panNumber as string) ?? null,
      supplierType: (row.supplierType as string) ?? null,
    };

    if (existing) {
      return this.prisma.supplier.update({
        where: { id: existing.id },
        data: { ...data, updatedBy: audit.userId },
      });
    }

    return this.prisma.supplier.create({
      data: {
        id: uuid(),
        tenantId,
        name,
        ...data,
        createdBy: audit.userId,
      },
    });
  }

  private cleanRow(row: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value !== undefined && value !== '') {
        clean[key] = value;
      }
    }
    return clean;
  }
}
