// ─── Insurance Policy Service ─────────────────────────────────
// CRUD for insurance policies, coverage checks, and expiry alerts.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { Prisma } from '@caratflow/db';
import { PrismaService } from '../../common/prisma.service';
import type {
  InsurancePolicyInput,
  InsurancePolicyListInput,
} from '@caratflow/shared-types';
import type { PaginatedResult } from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ComplianceInsuranceService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(tenantId: string, userId: string, input: InsurancePolicyInput) {
    const existing = await this.prisma.insurancePolicy.findFirst({
      where: this.tenantWhere(tenantId, { policyNumber: input.policyNumber }),
    });
    if (existing) {
      throw new BadRequestException(`Policy number ${input.policyNumber} already exists.`);
    }

    return this.prisma.insurancePolicy.create({
      data: {
        id: uuid(),
        tenantId,
        policyNumber: input.policyNumber,
        provider: input.provider,
        locationId: input.locationId ?? null,
        coverageType: input.coverageType,
        coveredValuePaise: BigInt(input.coveredValuePaise),
        premiumPaise: BigInt(input.premiumPaise),
        startDate: input.startDate,
        endDate: input.endDate,
        status: 'ACTIVE',
        claimHistory: (input.claimHistory ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        documentUrl: input.documentUrl ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async update(tenantId: string, userId: string, id: string, input: Partial<InsurancePolicyInput>) {
    const policy = await this.prisma.insurancePolicy.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!policy) throw new NotFoundException('Insurance policy not found.');

    return this.prisma.insurancePolicy.update({
      where: { id },
      data: {
        provider: input.provider,
        locationId: input.locationId,
        coverageType: input.coverageType,
        coveredValuePaise: input.coveredValuePaise ? BigInt(input.coveredValuePaise) : undefined,
        premiumPaise: input.premiumPaise ? BigInt(input.premiumPaise) : undefined,
        startDate: input.startDate,
        endDate: input.endDate,
        claimHistory: input.claimHistory as Prisma.InputJsonValue | undefined,
        documentUrl: input.documentUrl,
        updatedBy: userId,
      },
    });
  }

  async findById(tenantId: string, id: string) {
    const policy = await this.prisma.insurancePolicy.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!policy) throw new NotFoundException('Insurance policy not found.');
    return this.serializePolicy(policy);
  }

  async list(tenantId: string, input: InsurancePolicyListInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, sortBy, sortOrder, status, coverageType } = input;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (coverageType) where.coverageType = coverageType;

    const [items, total] = await Promise.all([
      this.prisma.insurancePolicy.findMany({
        where,
        orderBy: { [sortBy ?? 'endDate']: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.insurancePolicy.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items: items.map(this.serializePolicy),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async getCoverageSummary(tenantId: string) {
    const activePolicies = await this.prisma.insurancePolicy.findMany({
      where: this.tenantWhere(tenantId, { status: 'ACTIVE' }),
    });

    const totalCoveredPaise = activePolicies.reduce(
      (sum, p) => sum + Number(p.coveredValuePaise),
      0,
    );
    const totalPremiumPaise = activePolicies.reduce(
      (sum, p) => sum + Number(p.premiumPaise),
      0,
    );

    return {
      activePolicies: activePolicies.length,
      totalCoveredPaise,
      totalPremiumPaise,
    };
  }

  async markExpiredPolicies(tenantId: string) {
    const result = await this.prisma.insurancePolicy.updateMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        endDate: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
    return { updated: result.count };
  }

  private serializePolicy(policy: Record<string, unknown>): Record<string, unknown> {
    return {
      ...policy,
      coveredValuePaise: policy.coveredValuePaise ? Number(policy.coveredValuePaise) : 0,
      premiumPaise: policy.premiumPaise ? Number(policy.premiumPaise) : 0,
    };
  }
}
