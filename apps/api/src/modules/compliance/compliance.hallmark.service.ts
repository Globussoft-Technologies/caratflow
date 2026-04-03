// ─── Hallmark Submission Service ──────────────────────────────
// Hallmark center management and submission workflow.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type {
  HallmarkSubmissionInput,
  HallmarkSubmissionListInput,
  RecordHallmarkResults,
  HallmarkCenterInput,
} from '@caratflow/shared-types';
import type { PaginatedResult } from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ComplianceHallmarkService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── Hallmark Center CRUD ──────────────────────────────────

  async createCenter(input: HallmarkCenterInput) {
    const existing = await this.prisma.hallmarkCenter.findFirst({
      where: { centerCode: input.centerCode },
    });
    if (existing) {
      throw new BadRequestException(`Center code ${input.centerCode} already exists.`);
    }

    return this.prisma.hallmarkCenter.create({
      data: {
        id: uuid(),
        centerCode: input.centerCode,
        name: input.name,
        address: input.address ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        bisLicenseNumber: input.bisLicenseNumber ?? null,
        isActive: input.isActive ?? true,
      },
    });
  }

  async updateCenter(id: string, input: Partial<HallmarkCenterInput>) {
    const center = await this.prisma.hallmarkCenter.findUnique({ where: { id } });
    if (!center) throw new NotFoundException('Hallmark center not found.');

    return this.prisma.hallmarkCenter.update({
      where: { id },
      data: {
        name: input.name ?? center.name,
        address: input.address ?? center.address,
        city: input.city ?? center.city,
        state: input.state ?? center.state,
        phone: input.phone ?? center.phone,
        email: input.email ?? center.email,
        bisLicenseNumber: input.bisLicenseNumber ?? center.bisLicenseNumber,
        isActive: input.isActive ?? center.isActive,
      },
    });
  }

  async listCenters(activeOnly = true) {
    return this.prisma.hallmarkCenter.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });
  }

  async getCenterById(id: string) {
    const center = await this.prisma.hallmarkCenter.findUnique({ where: { id } });
    if (!center) throw new NotFoundException('Hallmark center not found.');
    return center;
  }

  // ─── Submission Workflow ───────────────────────────────────

  async createSubmission(tenantId: string, userId: string, input: HallmarkSubmissionInput) {
    const submissionNumber = `HM-${Date.now().toString(36).toUpperCase()}`;

    const submission = await this.prisma.hallmarkSubmission.create({
      data: {
        id: uuid(),
        tenantId,
        submissionNumber,
        hallmarkCenterId: input.hallmarkCenterId,
        locationId: input.locationId,
        submittedDate: input.submittedDate ?? new Date(),
        expectedReturnDate: input.expectedReturnDate ?? null,
        totalItems: input.items.length,
        notes: input.notes ?? null,
        createdBy: userId,
        updatedBy: userId,
        items: {
          create: input.items.map((item) => ({
            id: uuid(),
            tenantId,
            productId: item.productId,
            declaredPurity: item.declaredPurity,
            status: 'PENDING' as const,
            createdBy: userId,
            updatedBy: userId,
          })),
        },
      },
      include: {
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
        hallmarkCenter: true,
      },
    });

    return submission;
  }

  async recordResults(tenantId: string, userId: string, input: RecordHallmarkResults) {
    const submission = await this.prisma.hallmarkSubmission.findFirst({
      where: this.tenantWhere(tenantId, { id: input.submissionId }),
      include: { items: true },
    });
    if (!submission) throw new NotFoundException('Submission not found.');

    let passedCount = 0;
    let failedCount = 0;

    for (const result of input.results) {
      const item = submission.items.find((i) => i.id === result.itemId);
      if (!item) continue;

      await this.prisma.hallmarkSubmissionItem.update({
        where: { id: result.itemId },
        data: {
          status: result.status,
          testedPurity: result.testedPurity ?? null,
          huidAssigned: result.huidAssigned ?? null,
          failureReason: result.failureReason ?? null,
          notes: result.notes ?? null,
          updatedBy: userId,
        },
      });

      if (result.status === 'PASSED') {
        passedCount++;
        // If HUID assigned on pass, also register it
        if (result.huidAssigned) {
          await this.eventBus.publish({
            id: uuid(),
            tenantId,
            userId,
            timestamp: new Date().toISOString(),
            type: 'compliance.hallmark.verified',
            payload: {
              productId: item.productId,
              hallmarkNumber: result.huidAssigned,
              purity: result.testedPurity ?? item.declaredPurity,
            },
          });
        }
      } else if (result.status === 'FAILED') {
        failedCount++;
      }
    }

    // Determine overall submission status
    const allItems = await this.prisma.hallmarkSubmissionItem.findMany({
      where: { submissionId: input.submissionId },
    });
    const totalPassed = allItems.filter((i) => i.status === 'PASSED').length;
    const totalFailed = allItems.filter((i) => i.status === 'FAILED').length;
    const totalPending = allItems.filter((i) => i.status === 'PENDING' || i.status === 'REWORK').length;

    let status: string;
    if (totalPending > 0) {
      status = 'IN_PROGRESS';
    } else if (totalFailed === allItems.length) {
      status = 'REJECTED';
    } else if (totalFailed > 0) {
      status = 'PARTIAL_REJECT';
    } else {
      status = 'COMPLETED';
    }

    const updated = await this.prisma.hallmarkSubmission.update({
      where: { id: input.submissionId },
      data: {
        status: status as 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PARTIAL_REJECT' | 'REJECTED',
        passedItems: totalPassed,
        failedItems: totalFailed,
        actualReturnDate: totalPending === 0 ? new Date() : null,
        updatedBy: userId,
      },
      include: {
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
        hallmarkCenter: true,
      },
    });

    return updated;
  }

  async findById(tenantId: string, id: string) {
    const submission = await this.prisma.hallmarkSubmission.findFirst({
      where: this.tenantWhere(tenantId, { id }),
      include: {
        items: {
          include: { product: { select: { id: true, sku: true, name: true } } },
        },
        hallmarkCenter: true,
      },
    });
    if (!submission) throw new NotFoundException('Submission not found.');
    return submission;
  }

  async list(tenantId: string, input: HallmarkSubmissionListInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, sortBy, sortOrder, status, hallmarkCenterId } = input;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (hallmarkCenterId) where.hallmarkCenterId = hallmarkCenterId;

    const [items, total] = await Promise.all([
      this.prisma.hallmarkSubmission.findMany({
        where,
        include: { hallmarkCenter: true },
        orderBy: { [sortBy ?? 'submittedDate']: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.hallmarkSubmission.count({ where }),
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

  async getPendingCount(tenantId: string): Promise<number> {
    return this.prisma.hallmarkSubmission.count({
      where: this.tenantWhere(tenantId, {
        status: { in: ['SUBMITTED', 'IN_PROGRESS'] },
      }),
    });
  }
}
