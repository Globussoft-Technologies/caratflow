// ─── Wholesale Agent/Broker Service ────────────────────────────
// Agent CRUD, commission calculation, approval, payout tracking.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  AgentBrokerInput,
  AgentBrokerResponse,
  CommissionInput,
  CommissionResponse,
} from '@caratflow/shared-types';
import {
  WholesaleCommissionType,
  WholesaleCommissionStatus,
  WholesaleCommissionRefType,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WholesaleAgentService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Agent CRUD ────────────────────────────────────────────────

  async createAgent(
    tenantId: string,
    userId: string,
    input: AgentBrokerInput,
  ): Promise<AgentBrokerResponse> {
    const agent = await this.prisma.agentBroker.create({
      data: {
        id: uuidv4(),
        tenantId,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        commissionType: input.commissionType,
        commissionRate: input.commissionRate,
        isActive: input.isActive ?? true,
        bankAccountNumber: input.bankAccountNumber ?? null,
        ifscCode: input.ifscCode ?? null,
        panNumber: input.panNumber ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { commissions: true },
    });

    return this.mapAgentToResponse(agent);
  }

  async getAgent(tenantId: string, agentId: string): Promise<AgentBrokerResponse> {
    const agent = await this.prisma.agentBroker.findFirst({
      where: this.tenantWhere(tenantId, { id: agentId }) as { tenantId: string; id: string },
      include: { commissions: true },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return this.mapAgentToResponse(agent);
  }

  async listAgents(
    tenantId: string,
    filters: { isActive?: boolean },
    pagination: Pagination,
  ): Promise<PaginatedResult<AgentBrokerResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    const [items, total] = await Promise.all([
      this.prisma.agentBroker.findMany({
        where,
        include: { commissions: true },
        orderBy: { name: 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.agentBroker.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: items.map((a) => this.mapAgentToResponse(a)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  async updateAgent(
    tenantId: string,
    userId: string,
    agentId: string,
    data: Partial<AgentBrokerInput>,
  ): Promise<AgentBrokerResponse> {
    const existing = await this.prisma.agentBroker.findFirst({
      where: this.tenantWhere(tenantId, { id: agentId }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Agent not found');

    await this.prisma.agentBroker.update({
      where: { id: agentId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.commissionType !== undefined && { commissionType: data.commissionType }),
        ...(data.commissionRate !== undefined && { commissionRate: data.commissionRate }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.bankAccountNumber !== undefined && { bankAccountNumber: data.bankAccountNumber }),
        ...(data.ifscCode !== undefined && { ifscCode: data.ifscCode }),
        ...(data.panNumber !== undefined && { panNumber: data.panNumber }),
        updatedBy: userId,
      },
    });

    return this.getAgent(tenantId, agentId);
  }

  // ─── Commission Calculation ────────────────────────────────────

  async calculateCommission(
    tenantId: string,
    userId: string,
    input: CommissionInput,
  ): Promise<CommissionResponse> {
    const agent = await this.prisma.agentBroker.findFirst({
      where: this.tenantWhere(tenantId, { id: input.agentBrokerId }) as { tenantId: string; id: string },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    if (!agent.isActive) throw new BadRequestException('Agent is not active');

    let amountPaise: number;

    switch (agent.commissionType) {
      case 'PERCENTAGE':
        // commissionRate is percent * 100 (e.g., 250 = 2.5%)
        amountPaise = Math.round((input.amountPaise * agent.commissionRate) / 10000);
        break;
      case 'FIXED_PER_PIECE':
        amountPaise = agent.commissionRate;
        break;
      case 'FIXED_PER_WEIGHT':
        amountPaise = agent.commissionRate;
        break;
      default:
        amountPaise = 0;
    }

    const commission = await this.prisma.agentCommission.create({
      data: {
        id: uuidv4(),
        tenantId,
        agentBrokerId: input.agentBrokerId,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        amountPaise: BigInt(amountPaise),
        status: 'PENDING',
        createdBy: userId,
        updatedBy: userId,
      },
      include: { agentBroker: { select: { name: true } } },
    });

    return this.mapCommissionToResponse(commission);
  }

  async approveCommission(tenantId: string, userId: string, commissionId: string): Promise<CommissionResponse> {
    const commission = await this.prisma.agentCommission.findFirst({
      where: this.tenantWhere(tenantId, { id: commissionId }) as { tenantId: string; id: string },
    });
    if (!commission) throw new NotFoundException('Commission not found');
    if (commission.status !== 'PENDING') {
      throw new BadRequestException('Only pending commissions can be approved');
    }

    await this.prisma.agentCommission.update({
      where: { id: commissionId },
      data: { status: 'APPROVED', updatedBy: userId },
    });

    return this.getCommission(tenantId, commissionId);
  }

  async markCommissionPaid(
    tenantId: string,
    userId: string,
    commissionId: string,
    paymentReference?: string,
  ): Promise<CommissionResponse> {
    const commission = await this.prisma.agentCommission.findFirst({
      where: this.tenantWhere(tenantId, { id: commissionId }) as { tenantId: string; id: string },
    });
    if (!commission) throw new NotFoundException('Commission not found');
    if (commission.status !== 'APPROVED') {
      throw new BadRequestException('Only approved commissions can be marked paid');
    }

    await this.prisma.agentCommission.update({
      where: { id: commissionId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentReference: paymentReference ?? null,
        updatedBy: userId,
      },
    });

    return this.getCommission(tenantId, commissionId);
  }

  async getCommission(tenantId: string, commissionId: string): Promise<CommissionResponse> {
    const commission = await this.prisma.agentCommission.findFirst({
      where: this.tenantWhere(tenantId, { id: commissionId }) as { tenantId: string; id: string },
      include: { agentBroker: { select: { name: true } } },
    });
    if (!commission) throw new NotFoundException('Commission not found');
    return this.mapCommissionToResponse(commission);
  }

  async listCommissions(
    tenantId: string,
    filters: { agentBrokerId?: string; status?: string },
    pagination: Pagination,
  ): Promise<PaginatedResult<CommissionResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.agentBrokerId) where.agentBrokerId = filters.agentBrokerId;
    if (filters.status) where.status = filters.status;

    const [items, total] = await Promise.all([
      this.prisma.agentCommission.findMany({
        where,
        include: { agentBroker: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.agentCommission.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: items.map((c) => this.mapCommissionToResponse(c)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  // ─── Agent Dashboard (mobile) ──────────────────────────────────

  /**
   * Aggregate dashboard metrics for the Agent mobile app.
   * Returns collections for this month, outstanding balance across
   * assigned customers (customers this agent has interacted with),
   * visits this week, and purchase orders booked this month.
   */
  async getAgentDashboard(tenantId: string, agentId: string): Promise<{
    agentId: string;
    collectionsThisMonthPaise: string;
    outstandingForAssignedCustomersPaise: string;
    visitsThisWeek: number;
    ordersBookedThisMonth: number;
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const day = now.getDay();
    const daysFromMon = (day + 6) % 7;
    const weekStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysFromMon,
    );

    // 1) Collections this month — payments recorded by this agent.
    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        createdBy: agentId,
        paymentType: 'RECEIVED',
        createdAt: { gte: monthStart },
      },
      select: { amountPaise: true },
    });
    const collectionsThisMonthPaise = payments.reduce(
      (sum, p) => sum + p.amountPaise,
      0n,
    );

    // 2) Assigned customers = customers this agent has recorded interactions with.
    const interactions = await this.prisma.customerInteraction.findMany({
      where: { tenantId, userId: agentId },
      select: { customerId: true },
      distinct: ['customerId'],
    });
    const assignedCustomerIds = interactions.map((i) => i.customerId);

    let outstandingForAssignedCustomersPaise = 0n;
    if (assignedCustomerIds.length > 0) {
      const obs = await this.prisma.outstandingBalance.findMany({
        where: {
          tenantId,
          entityType: 'CUSTOMER',
          entityId: { in: assignedCustomerIds },
          status: { in: ['CURRENT', 'OVERDUE'] },
        },
        select: { balancePaise: true },
      });
      outstandingForAssignedCustomersPaise = obs.reduce(
        (sum, o) => sum + o.balancePaise,
        0n,
      );
    }

    // 3) Visits this week — CustomerInteraction rows with interactionType=VISIT
    //    by this agent.
    const visitsThisWeek = await this.prisma.customerInteraction.count({
      where: {
        tenantId,
        userId: agentId,
        interactionType: 'VISIT',
        createdAt: { gte: weekStart },
      },
    });

    // 4) Orders booked this month — PurchaseOrders created by this agent.
    const ordersBookedThisMonth = await this.prisma.purchaseOrder.count({
      where: {
        tenantId,
        createdBy: agentId,
        createdAt: { gte: monthStart },
      },
    });

    return {
      agentId,
      collectionsThisMonthPaise: collectionsThisMonthPaise.toString(),
      outstandingForAssignedCustomersPaise:
        outstandingForAssignedCustomersPaise.toString(),
      visitsThisWeek,
      ordersBookedThisMonth,
    };
  }

  /**
   * Record an agent visit. Writes a CustomerInteraction row with
   * interactionType=VISIT and stores agent-specific metadata
   * (agentId, outcome, visitDate) in the attachments JSON column.
   */
  async recordAgentVisit(
    tenantId: string,
    userId: string,
    input: {
      agentId: string;
      customerId: string;
      visitDate: Date;
      notes?: string;
      outcome?: string;
    },
  ): Promise<{
    id: string;
    customerId: string;
    agentId: string;
    visitDate: string;
    outcome: string | null;
    notes: string | null;
  }> {
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId, id: input.customerId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const interaction = await this.prisma.customerInteraction.create({
      data: {
        id: uuidv4(),
        tenantId,
        customerId: input.customerId,
        interactionType: 'VISIT',
        direction: 'OUTBOUND',
        subject: input.outcome ? `Agent visit: ${input.outcome}` : 'Agent visit',
        content: input.notes ?? null,
        userId: input.agentId,
        attachments: {
          agentVisit: true,
          agentId: input.agentId,
          outcome: input.outcome ?? null,
          visitDate: input.visitDate.toISOString(),
        },
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return {
      id: interaction.id,
      customerId: interaction.customerId,
      agentId: input.agentId,
      visitDate: input.visitDate.toISOString(),
      outcome: input.outcome ?? null,
      notes: interaction.content ?? null,
    };
  }

  // ─── Mappers ───────────────────────────────────────────────────

  private mapAgentToResponse(agent: Record<string, unknown>): AgentBrokerResponse {
    const a = agent as Record<string, unknown>;
    const commissions = (a.commissions as Array<Record<string, unknown>>) ?? [];

    const totalCommissionPaise = commissions.reduce(
      (sum, c) => sum + Number(c.amountPaise),
      0,
    );
    const pendingCommissionPaise = commissions
      .filter((c) => c.status !== 'PAID')
      .reduce((sum, c) => sum + Number(c.amountPaise), 0);

    return {
      id: a.id as string,
      tenantId: a.tenantId as string,
      name: a.name as string,
      phone: (a.phone as string) ?? null,
      email: (a.email as string) ?? null,
      commissionType: a.commissionType as WholesaleCommissionType,
      commissionRate: a.commissionRate as number,
      isActive: a.isActive as boolean,
      bankAccountNumber: (a.bankAccountNumber as string) ?? null,
      ifscCode: (a.ifscCode as string) ?? null,
      panNumber: (a.panNumber as string) ?? null,
      totalCommissionPaise,
      pendingCommissionPaise,
      createdAt: new Date(a.createdAt as string).toISOString(),
      updatedAt: new Date(a.updatedAt as string).toISOString(),
    };
  }

  private mapCommissionToResponse(commission: Record<string, unknown>): CommissionResponse {
    const c = commission as Record<string, unknown>;
    const agent = c.agentBroker as Record<string, unknown> | undefined;

    return {
      id: c.id as string,
      tenantId: c.tenantId as string,
      agentBrokerId: c.agentBrokerId as string,
      agentName: agent?.name as string | undefined,
      referenceType: c.referenceType as WholesaleCommissionRefType,
      referenceId: c.referenceId as string,
      amountPaise: Number(c.amountPaise),
      status: c.status as WholesaleCommissionStatus,
      paidAt: c.paidAt ? new Date(c.paidAt as string).toISOString() : null,
      paymentReference: (c.paymentReference as string) ?? null,
      createdAt: new Date(c.createdAt as string).toISOString(),
      updatedAt: new Date(c.updatedAt as string).toISOString(),
    };
  }
}
