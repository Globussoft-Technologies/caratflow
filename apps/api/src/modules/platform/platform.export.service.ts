import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { TenantAwareService } from '../../common/base.service';
import { Prisma } from '@caratflow/db';
import { PrismaService } from '../../common/prisma.service';
import type { AuditMeta } from '@caratflow/shared-types';
import { PlatformPdfService } from './platform.pdf.service';

type ExportEntityType = 'customer' | 'product' | 'supplier' | 'invoice' | 'stock';
type ExportFormatType = 'CSV' | 'XLSX' | 'PDF';

interface ExportFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  isActive?: boolean;
  [key: string]: unknown;
}

interface CreateExportInput {
  entityType: ExportEntityType;
  filters?: ExportFilters;
  format: ExportFormatType;
}

@Injectable()
export class PlatformExportService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    @Optional() private readonly pdfService?: PlatformPdfService,
  ) {
    super(prisma);
  }

  /** Create an export job and begin processing. */
  async createExportJob(tenantId: string, input: CreateExportInput, audit: AuditMeta) {
    const job = await this.prisma.exportJob.create({
      data: {
        id: uuid(),
        tenantId,
        entityType: input.entityType,
        filters: (input.filters ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        format: input.format,
        status: 'PENDING',
        createdBy: audit.userId,
      },
    });

    // Kick off processing asynchronously (in production, use BullMQ job)
    this.processExport(tenantId, job.id, input, audit).catch((err) => {
      console.error(`[Export] Job ${job.id} failed:`, err);
    });

    return job;
  }

  /** Process an export job: query data, format, and generate file. */
  async processExport(
    tenantId: string,
    jobId: string,
    input: CreateExportInput,
    audit: AuditMeta,
  ) {
    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    try {
      const data = await this.fetchEntityData(tenantId, input.entityType, input.filters);

      // Generate file content based on format
      let fileContent: string | Buffer;
      let fileName: string;
      let fileSize = 0;

      switch (input.format) {
        case 'CSV':
          fileContent = this.toCsv(data);
          fileName = `${input.entityType}_export_${Date.now()}.csv`;
          fileSize = Buffer.byteLength(fileContent, 'utf-8');
          break;
        case 'XLSX':
          // In production, use a library like exceljs
          fileContent = this.toCsv(data); // Fallback to CSV for now
          fileName = `${input.entityType}_export_${Date.now()}.xlsx`;
          fileSize = Buffer.byteLength(fileContent, 'utf-8');
          break;
        case 'PDF':
          if (!this.pdfService) {
            throw new BadRequestException(
              'PDF export not available: PlatformPdfService not wired',
            );
          }
          fileContent = await this.pdfService.renderTemplate('export-doc', {
            documentType: `${input.entityType.toUpperCase()} EXPORT`,
            documentNumber: `EXP-${Date.now()}`,
            issuedDate: new Date().toISOString().slice(0, 10),
            exporterName: 'CaratFlow Tenant',
            exporterAddress: '',
            consigneeName: '',
            consigneeAddress: '',
            destinationCountry: '',
            orderNumber: input.entityType,
            currency: 'INR',
            portOfLoading: '',
            portOfDischarge: '',
            vessel: '',
            incoterm: '',
            declaration: `Data export of ${data.length} ${input.entityType} records.`,
            lineItemsRows: this.pdfService.buildTableRows(
              data.slice(0, 100),
              Object.keys(data[0] ?? {}).slice(0, 6),
            ),
          });
          fileName = `${input.entityType}_export_${Date.now()}.pdf`;
          fileSize = fileContent.length;
          break;
        default:
          throw new BadRequestException(`Unsupported format: ${input.format}`);
      }

      // In production, upload to S3/MinIO and store the URL
      const fileUrl = `/exports/${fileName}`;
      console.warn(
        `[Export] Generated file: ${fileName} with ${data.length} rows (${fileSize} bytes)`,
      );

      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          fileUrl,
          totalRows: data.length,
          completedAt: new Date(),
        },
      });

      return { jobId, status: 'COMPLETED', fileUrl, totalRows: data.length };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', completedAt: new Date() },
      });
      throw new BadRequestException(`Export failed: ${message}`);
    }
  }

  /** Get export job status. */
  async getExportJob(tenantId: string, jobId: string) {
    const job = await this.prisma.exportJob.findFirst({
      where: this.tenantWhere(tenantId, { id: jobId }),
    });
    if (!job) {
      throw new NotFoundException('Export job not found');
    }
    return job;
  }

  /** List export jobs for a tenant. */
  async listExportJobs(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.exportJob.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.exportJob.count({ where: { tenantId } }),
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

  private async fetchEntityData(
    tenantId: string,
    entityType: ExportEntityType,
    filters?: ExportFilters,
  ): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = { tenantId };

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { email: { contains: filters.search } },
      ];
    }

    switch (entityType) {
      case 'customer':
        return this.prisma.customer.findMany({ where }) as unknown as Record<string, unknown>[];
      case 'product':
        return this.prisma.product.findMany({ where }) as unknown as Record<string, unknown>[];
      case 'supplier':
        return this.prisma.supplier.findMany({ where }) as unknown as Record<string, unknown>[];
      default:
        throw new BadRequestException(`Export not supported for entity: ${entityType}`);
    }
  }

  private toCsv(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]!);
    const rows = data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        // Escape CSV values containing commas, quotes, or newlines
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
