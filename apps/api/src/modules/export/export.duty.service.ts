// ─── Export Duty Service ─────────────────────────────────────────
// Customs duty: HS code lookup, calculate duty for destination country,
// handle exemptions, DGFT license utilization tracking.

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type {
  CustomsDutyCalculation,
  DutyCalculationResult,
  DgftLicenseInput,
  DgftLicenseResponse,
  HsCodeSearch,
  HsCodeResponse,
} from '@caratflow/shared-types';
import { DgftLicenseStatus } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { Prisma } from '@caratflow/db';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ExportDutyService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── HS Code Lookup ─────────────────────────────────────────────

  async searchHsCodes(search: HsCodeSearch, pagination: Pagination): Promise<PaginatedResult<HsCodeResponse>> {
    const where: Record<string, unknown> = {};

    if (search.isActive !== undefined) where.isActive = search.isActive;
    if (search.chapter) where.chapter = search.chapter;
    if (search.query) {
      where.OR = [
        { hsCode: { contains: search.query } },
        { description: { contains: search.query } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.hsCode.findMany({
        where,
        orderBy: { hsCode: 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.hsCode.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((hs) => ({
        id: hs.id,
        hsCode: hs.hsCode,
        description: hs.description,
        chapter: hs.chapter,
        heading: hs.heading,
        subheading: hs.subheading,
        defaultDutyRate: hs.defaultDutyRate,
        isActive: hs.isActive,
      })),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  async getHsCode(hsCode: string): Promise<HsCodeResponse> {
    const hs = await this.prisma.hsCode.findUnique({
      where: { hsCode },
    });
    if (!hs) throw new NotFoundException(`HS code ${hsCode} not found`);

    return {
      id: hs.id,
      hsCode: hs.hsCode,
      description: hs.description,
      chapter: hs.chapter,
      heading: hs.heading,
      subheading: hs.subheading,
      defaultDutyRate: hs.defaultDutyRate,
      isActive: hs.isActive,
    };
  }

  // ─── Calculate Duty ─────────────────────────────────────────────

  async calculateDuty(
    tenantId: string,
    userId: string,
    input: CustomsDutyCalculation,
  ): Promise<DutyCalculationResult> {
    // Look up HS code
    const hsRecord = await this.prisma.hsCode.findUnique({
      where: { hsCode: input.hsCode },
    });

    // Check for country-specific compliance rules
    const complianceRule = await this.prisma.exportCompliance.findUnique({
      where: {
        destinationCountry_productCategory: {
          destinationCountry: input.importCountry,
          productCategory: hsRecord?.chapter ?? input.hsCode.substring(0, 2),
        },
      },
    });

    const dutyRate = hsRecord?.defaultDutyRate ?? 0;
    const assessableValuePaise = BigInt(input.assessableValuePaise);
    const dutyAmountPaise = (assessableValuePaise * BigInt(dutyRate)) / 10000n;

    // Check for exemptions from compliance rules
    const exemptions = complianceRule?.dutyExemptions
      ? (complianceRule.dutyExemptions as Record<string, unknown>[])
      : [];

    // Optionally save calculation if linked to order
    if (input.exportOrderId) {
      await this.prisma.customsDuty.create({
        data: {
          id: uuidv4(),
          tenantId,
          exportOrderId: input.exportOrderId,
          importCountry: input.importCountry,
          hsCode: input.hsCode,
          dutyRate,
          dutyAmountPaise,
          assessableValuePaise,
          exemptions: (exemptions.length > 0 ? exemptions : undefined) as Prisma.InputJsonValue | undefined,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }

    return {
      importCountry: input.importCountry,
      hsCode: input.hsCode,
      hsDescription: hsRecord?.description ?? 'Unknown HS code',
      dutyRate,
      dutyAmountPaise: Number(dutyAmountPaise),
      cessRate: null,
      cessAmountPaise: null,
      assessableValuePaise: Number(assessableValuePaise),
      totalDutyPaise: Number(dutyAmountPaise),
      exemptions,
    };
  }

  // ─── DGFT License CRUD ─────────────────────────────────────────

  async createLicense(
    tenantId: string,
    userId: string,
    input: DgftLicenseInput,
  ): Promise<DgftLicenseResponse> {
    const licenseId = uuidv4();

    await this.prisma.dgftLicense.create({
      data: {
        id: licenseId,
        tenantId,
        licenseNumber: input.licenseNumber,
        licenseType: input.licenseType,
        issuedDate: input.issuedDate,
        expiryDate: input.expiryDate,
        valuePaise: BigInt(input.valuePaise),
        usedValuePaise: 0n,
        balanceValuePaise: BigInt(input.valuePaise),
        status: 'ACTIVE',
        fileUrl: input.fileUrl ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.getLicense(tenantId, licenseId);
  }

  async getLicense(tenantId: string, licenseId: string): Promise<DgftLicenseResponse> {
    const license = await this.prisma.dgftLicense.findFirst({
      where: this.tenantWhere(tenantId, { id: licenseId }) as { tenantId: string; id: string },
    });
    if (!license) throw new NotFoundException('DGFT license not found');
    return this.mapLicenseToResponse(license);
  }

  async listLicenses(
    tenantId: string,
    filters: { status?: DgftLicenseStatus; licenseType?: string },
    pagination: Pagination,
  ): Promise<PaginatedResult<DgftLicenseResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.status) where.status = filters.status;
    if (filters.licenseType) where.licenseType = filters.licenseType;

    const [items, total] = await Promise.all([
      this.prisma.dgftLicense.findMany({
        where,
        orderBy: { expiryDate: 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.dgftLicense.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((l) => this.mapLicenseToResponse(l)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  async utilizeLicense(
    tenantId: string,
    userId: string,
    licenseId: string,
    amountPaise: number,
  ): Promise<DgftLicenseResponse> {
    const license = await this.prisma.dgftLicense.findFirst({
      where: this.tenantWhere(tenantId, { id: licenseId }) as { tenantId: string; id: string },
    });
    if (!license) throw new NotFoundException('DGFT license not found');
    if (license.status !== 'ACTIVE') {
      throw new BadRequestException(`License is ${license.status}, cannot utilize`);
    }

    const newUsed = license.usedValuePaise + BigInt(amountPaise);
    const newBalance = license.valuePaise - newUsed;

    if (newBalance < 0n) {
      throw new BadRequestException(
        `Insufficient license balance. Available: ${Number(license.balanceValuePaise)} paise, requested: ${amountPaise} paise`,
      );
    }

    const newStatus = newBalance === 0n ? 'UTILIZED' : 'ACTIVE';

    await this.prisma.dgftLicense.update({
      where: { id: licenseId },
      data: {
        usedValuePaise: newUsed,
        balanceValuePaise: newBalance,
        status: newStatus,
        updatedBy: userId,
      },
    });

    return this.getLicense(tenantId, licenseId);
  }

  // ─── Mapper ─────────────────────────────────────────────────────

  private mapLicenseToResponse(license: Record<string, unknown>): DgftLicenseResponse {
    const l = license as Record<string, unknown>;
    const value = Number(l.valuePaise);
    const used = Number(l.usedValuePaise);

    return {
      id: l.id as string,
      tenantId: l.tenantId as string,
      licenseNumber: l.licenseNumber as string,
      licenseType: l.licenseType as DgftLicenseType,
      issuedDate: new Date(l.issuedDate as string).toISOString(),
      expiryDate: new Date(l.expiryDate as string).toISOString(),
      valuePaise: value,
      usedValuePaise: used,
      balanceValuePaise: Number(l.balanceValuePaise),
      utilizationPercent: value > 0 ? Math.round((used / value) * 100) : 0,
      status: l.status as DgftLicenseStatus,
      fileUrl: (l.fileUrl as string) ?? null,
      createdAt: new Date(l.createdAt as string).toISOString(),
      updatedAt: new Date(l.updatedAt as string).toISOString(),
    };
  }
}

// Re-import for type annotations
import type { DgftLicenseType } from '@caratflow/shared-types';
