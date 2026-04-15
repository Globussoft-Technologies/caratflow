// ─── CRM Lead Service ──────────────────────────────────────────
// Lead management: CRUD, pipeline status, activity logging, assignment,
// follow-up reminders, conversion tracking.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@caratflow/db';
import type {
  LeadInput,
  LeadActivityInput,
  LeadStatusUpdate,
} from '@caratflow/shared-types';

@Injectable()
export class CrmLeadService extends TenantAwareService {
  private readonly logger = new Logger(CrmLeadService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Lead CRUD ─────────────────────────────────────────────────

  async createLead(tenantId: string, userId: string, input: LeadInput) {
    return this.prisma.lead.create({
      data: {
        tenantId,
        customerId: input.customerId,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        email: input.email,
        source: input.source,
        status: 'NEW',
        assignedTo: input.assignedTo ?? userId,
        estimatedValuePaise: input.estimatedValuePaise ? BigInt(input.estimatedValuePaise) : undefined,
        notes: input.notes,
        nextFollowUpDate: input.nextFollowUpDate,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async updateLead(tenantId: string, userId: string, leadId: string, input: Partial<LeadInput>) {
    await this.prisma.lead.findFirstOrThrow({
      where: { id: leadId, tenantId },
    });
    return this.prisma.lead.update({
      where: { id: leadId },
      data: {
        ...input,
        estimatedValuePaise: input.estimatedValuePaise !== undefined
          ? BigInt(input.estimatedValuePaise)
          : undefined,
        updatedBy: userId,
      },
    });
  }

  async getLead(tenantId: string, leadId: string) {
    return this.prisma.lead.findFirstOrThrow({
      where: { id: leadId, tenantId },
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true, email: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
  }

  async listLeads(tenantId: string, page = 1, limit = 20, status?: string, assignedTo?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (assignedTo) where.assignedTo = assignedTo;

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where: where as Prisma.LeadWhereInput,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { firstName: true, lastName: true } },
          _count: { select: { activities: true } },
        },
      }),
      this.prisma.lead.count({
        where: where as Prisma.LeadWhereInput,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  /** Get leads grouped by status for Kanban view */
  async getLeadPipeline(tenantId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { tenantId, status: { notIn: ['WON', 'LOST'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        source: true,
        estimatedValuePaise: true,
        assignedTo: true,
        nextFollowUpDate: true,
        createdAt: true,
      },
    });

    const pipeline: Record<string, typeof leads> = {
      NEW: [],
      CONTACTED: [],
      QUALIFIED: [],
      PROPOSAL: [],
      NEGOTIATION: [],
    };

    for (const lead of leads) {
      const statusLeads = pipeline[lead.status];
      if (statusLeads) {
        statusLeads.push(lead);
      }
    }

    return pipeline;
  }

  // ─── Status Updates ────────────────────────────────────────────

  async updateLeadStatus(tenantId: string, userId: string, input: LeadStatusUpdate) {
    const lead = await this.prisma.lead.findFirstOrThrow({
      where: { id: input.leadId, tenantId },
    });

    const updateData: Record<string, unknown> = {
      status: input.status,
      updatedBy: userId,
    };

    if (input.status === 'LOST' && input.lostReason) {
      updateData.lostReason = input.lostReason;
    }

    const updated = await this.prisma.lead.update({
      where: { id: input.leadId },
      data: updateData as Parameters<typeof this.prisma.lead.update>[0]['data'],
    });

    // Log status change as activity
    await this.prisma.leadActivity.create({
      data: {
        tenantId,
        leadId: input.leadId,
        activityType: 'NOTE',
        description: `Status changed from ${lead.status} to ${input.status}${input.lostReason ? ` (Reason: ${input.lostReason})` : ''}`,
        completedAt: new Date(),
        userId,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return updated;
  }

  /** Assign lead to a sales staff member */
  async assignLead(tenantId: string, userId: string, leadId: string, assignToUserId: string) {
    await this.prisma.lead.findFirstOrThrow({
      where: { id: leadId, tenantId },
    });

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: { assignedTo: assignToUserId, updatedBy: userId },
    });

    await this.prisma.leadActivity.create({
      data: {
        tenantId,
        leadId,
        activityType: 'NOTE',
        description: `Lead assigned to ${assignToUserId}`,
        completedAt: new Date(),
        userId,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return updated;
  }

  // ─── Activity Logging ──────────────────────────────────────────

  async addActivity(tenantId: string, userId: string, input: LeadActivityInput) {
    await this.prisma.lead.findFirstOrThrow({
      where: { id: input.leadId, tenantId },
    });

    return this.prisma.leadActivity.create({
      data: {
        tenantId,
        leadId: input.leadId,
        activityType: input.activityType,
        description: input.description,
        scheduledAt: input.scheduledAt,
        completedAt: input.completedAt,
        userId,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async listActivities(tenantId: string, leadId: string) {
    return this.prisma.leadActivity.findMany({
      where: { tenantId, leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Follow-up Reminders ───────────────────────────────────────

  /** Get leads needing follow-up today (for BullMQ cron job) */
  async getOverdueFollowUps(tenantId: string) {
    const now = new Date();
    return this.prisma.lead.findMany({
      where: {
        tenantId,
        status: { notIn: ['WON', 'LOST'] },
        nextFollowUpDate: { lte: now },
      },
      include: {
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { nextFollowUpDate: 'asc' },
    });
  }

  // ─── Conversion Tracking ───────────────────────────────────────

  /** Convert a lead to a customer (lead -> customer -> first sale) */
  async convertToCustomer(tenantId: string, userId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirstOrThrow({
      where: { id: leadId, tenantId },
    });

    // Check if already linked to a customer
    if (lead.customerId) {
      await this.updateLeadStatus(tenantId, userId, { leadId, status: 'WON' });
      return { leadId, customerId: lead.customerId, alreadyExisted: true };
    }

    // Create customer from lead info
    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        email: lead.email,
        customerType: 'RETAIL',
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Link lead to customer and mark as WON
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { customerId: customer.id, status: 'WON', updatedBy: userId },
    });

    await this.prisma.leadActivity.create({
      data: {
        tenantId,
        leadId,
        activityType: 'NOTE',
        description: `Converted to customer ${customer.firstName} ${customer.lastName}`,
        completedAt: new Date(),
        userId,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return { leadId, customerId: customer.id, alreadyExisted: false };
  }
}
