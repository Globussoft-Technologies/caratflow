// ─── BNPL Service ─────────────────────────────────────────────
// Buy Now Pay Later operations: eligibility checks, transaction
// initiation, provider callbacks, and transaction management.

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import type {
  BnplProviderInput,
  BnplProviderResponse,
  InitiateBnplInput,
  BnplTransactionResponse,
  EligibilityResult,
  EmiCalculation,
  BnplTransactionListFilter,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { BnplProviderName, BnplTransactionStatus } from '@caratflow/shared-types';
import { Prisma } from '@caratflow/db';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { BnplEmiService } from './bnpl.emi.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BnplService extends TenantAwareService {
  private readonly logger = new Logger(BnplService.name);

  constructor(
    prisma: PrismaService,
    private readonly emiService: BnplEmiService,
  ) {
    super(prisma);
  }

  // ─── Provider CRUD ────────────────────────────────────────────

  async createProvider(tenantId: string, userId: string, input: BnplProviderInput): Promise<BnplProviderResponse> {
    if (input.minOrderPaise >= input.maxOrderPaise) {
      throw new BadRequestException('minOrderPaise must be less than maxOrderPaise');
    }

    const provider = await this.prisma.bnplProvider.create({
      data: {
        id: uuidv4(),
        tenantId,
        providerName: input.providerName,
        displayName: input.displayName,
        apiKey: input.apiKey ?? null,
        apiSecret: input.apiSecret ?? null,
        webhookSecret: input.webhookSecret ?? null,
        isActive: input.isActive ?? true,
        minOrderPaise: BigInt(input.minOrderPaise),
        maxOrderPaise: BigInt(input.maxOrderPaise),
        supportedTenures: input.supportedTenures,
        processingFeePct: input.processingFeePct ?? 0,
        settings: (input.settings ?? undefined) as Prisma.InputJsonValue | undefined,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapProviderToResponse(provider);
  }

  async getProvider(tenantId: string, providerId: string): Promise<BnplProviderResponse> {
    const provider = await this.prisma.bnplProvider.findFirst({
      where: { id: providerId, tenantId },
    });
    if (!provider) {
      throw new NotFoundException('BNPL provider not found');
    }
    return this.mapProviderToResponse(provider);
  }

  async listProviders(tenantId: string): Promise<BnplProviderResponse[]> {
    const providers = await this.prisma.bnplProvider.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return providers.map((p) => this.mapProviderToResponse(p));
  }

  async updateProvider(
    tenantId: string,
    userId: string,
    providerId: string,
    input: Partial<BnplProviderInput>,
  ): Promise<BnplProviderResponse> {
    const existing = await this.prisma.bnplProvider.findFirst({
      where: { id: providerId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('BNPL provider not found');
    }

    const updated = await this.prisma.bnplProvider.update({
      where: { id: providerId },
      data: {
        displayName: input.displayName ?? undefined,
        apiKey: input.apiKey ?? undefined,
        apiSecret: input.apiSecret ?? undefined,
        webhookSecret: input.webhookSecret ?? undefined,
        isActive: input.isActive ?? undefined,
        minOrderPaise: input.minOrderPaise !== undefined ? BigInt(input.minOrderPaise) : undefined,
        maxOrderPaise: input.maxOrderPaise !== undefined ? BigInt(input.maxOrderPaise) : undefined,
        supportedTenures: input.supportedTenures ?? undefined,
        processingFeePct: input.processingFeePct ?? undefined,
        settings: (input.settings ?? undefined) as Prisma.InputJsonValue | undefined,
        updatedBy: userId,
      },
    });

    return this.mapProviderToResponse(updated);
  }

  async toggleProvider(tenantId: string, userId: string, providerId: string, isActive: boolean): Promise<BnplProviderResponse> {
    const existing = await this.prisma.bnplProvider.findFirst({
      where: { id: providerId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('BNPL provider not found');
    }

    const updated = await this.prisma.bnplProvider.update({
      where: { id: providerId },
      data: { isActive, updatedBy: userId },
    });

    return this.mapProviderToResponse(updated);
  }

  // ─── Eligibility ──────────────────────────────────────────────

  async checkEligibility(tenantId: string, customerId: string, amountPaise: number): Promise<EligibilityResult> {
    // Find active providers that support this amount range
    const providers = await this.prisma.bnplProvider.findMany({
      where: {
        tenantId,
        isActive: true,
        minOrderPaise: { lte: BigInt(amountPaise) },
        maxOrderPaise: { gte: BigInt(amountPaise) },
      },
    });

    // Find active EMI plans that support this amount
    const plans = await this.prisma.emiPlan.findMany({
      where: {
        tenantId,
        isActive: true,
        minAmountPaise: { lte: BigInt(amountPaise) },
        maxAmountPaise: { gte: BigInt(amountPaise) },
      },
    });

    const emiCalculations: EmiCalculation[] = plans.map((plan) => {
      const calc = this.emiService.calculateEmi(
        amountPaise,
        plan.tenure,
        plan.interestRatePct,
      );

      return {
        planId: plan.id,
        bankName: plan.bankName,
        tenure: plan.tenure,
        interestRatePct: plan.interestRatePct,
        isNoCostEmi: plan.isNoCostEmi,
        monthlyEmiPaise: calc.monthlyEmiPaise,
        totalInterestPaise: calc.totalInterestPaise,
        totalPayablePaise: calc.totalPayablePaise,
        processingFeePaise: Number(plan.processingFeePaise),
      };
    });

    return {
      eligible: providers.length > 0 || plans.length > 0,
      providers: providers.map((p) => ({
        providerName: p.providerName as BnplProviderName,
        displayName: p.displayName,
        providerId: p.id,
        maxAmountPaise: Number(p.maxOrderPaise),
        supportedTenures: p.supportedTenures as number[],
        processingFeePct: p.processingFeePct,
      })),
      emiPlans: emiCalculations,
    };
  }

  // ─── Initiate BNPL ────────────────────────────────────────────

  async initiateBnpl(
    tenantId: string,
    userId: string,
    customerId: string,
    input: InitiateBnplInput,
  ): Promise<BnplTransactionResponse> {
    // Validate the provider exists and is active
    const provider = await this.prisma.bnplProvider.findFirst({
      where: {
        tenantId,
        providerName: input.providerName,
        isActive: true,
      },
    });
    if (!provider) {
      throw new NotFoundException('BNPL provider not found or inactive');
    }

    // Look up the order to get amount (using orderId as a reference)
    const order = await this.prisma.onlineOrder.findFirst({
      where: { tenantId, id: input.orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const orderAmountPaise = Number(order.totalPaise);

    // Validate amount is within provider limits
    if (orderAmountPaise < Number(provider.minOrderPaise) || orderAmountPaise > Number(provider.maxOrderPaise)) {
      throw new BadRequestException(
        `Order amount must be between ${Number(provider.minOrderPaise)} and ${Number(provider.maxOrderPaise)} paise`,
      );
    }

    // Determine EMI plan and calculate schedule
    let tenure = (provider.supportedTenures as number[])[0] ?? 3;
    let interestRatePct = 0;
    let processingFeePaise = 0;

    if (input.planId) {
      const plan = await this.prisma.emiPlan.findFirst({
        where: { id: input.planId, tenantId, isActive: true },
      });
      if (!plan) {
        throw new NotFoundException('EMI plan not found or inactive');
      }
      tenure = plan.tenure;
      interestRatePct = plan.interestRatePct;
      processingFeePaise = Number(plan.processingFeePaise);
    }

    const calc = this.emiService.calculateEmi(orderAmountPaise, tenure, interestRatePct);

    // Create the transaction
    const transaction = await this.prisma.bnplTransaction.create({
      data: {
        id: uuidv4(),
        tenantId,
        orderId: input.orderId,
        customerId,
        providerName: input.providerName,
        planId: input.planId ?? null,
        orderAmountPaise: BigInt(orderAmountPaise),
        emiAmountPaise: BigInt(calc.monthlyEmiPaise),
        tenure,
        interestPaise: BigInt(calc.totalInterestPaise),
        processingFeePaise: BigInt(processingFeePaise),
        totalPayablePaise: BigInt(calc.totalPayablePaise + processingFeePaise),
        status: 'INITIATED',
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Generate EMI schedule entries
    const startDate = new Date();
    const schedule = this.emiService.generateEmiSchedule(orderAmountPaise, tenure, interestRatePct, startDate);

    for (const item of schedule) {
      await this.prisma.emiSchedule.create({
        data: {
          id: uuidv4(),
          tenantId,
          transactionId: transaction.id,
          installmentNumber: item.installmentNumber,
          dueDate: new Date(item.dueDate),
          amountPaise: BigInt(item.amountPaise),
          principalPaise: BigInt(item.principalPaise),
          interestPaise: BigInt(item.interestPaise),
          status: 'UPCOMING',
        },
      });
    }

    this.logger.log(
      `BNPL transaction initiated: ${transaction.id} for order ${input.orderId}, provider ${input.providerName}`,
    );

    // In production, this would call the BNPL provider API to create the transaction
    // and return a redirect URL for the customer.
    // For now, we return the transaction response.

    return this.mapTransactionToResponse(transaction);
  }

  // ─── Handle Provider Callback ─────────────────────────────────

  async handleBnplCallback(
    tenantId: string,
    providerName: string,
    payload: Record<string, unknown>,
  ): Promise<BnplTransactionResponse> {
    // In production, verify webhook signature using the provider's webhookSecret
    const externalTransactionId = payload.transactionId as string | undefined;
    const status = payload.status as string | undefined;

    if (!externalTransactionId) {
      throw new BadRequestException('Missing transactionId in callback payload');
    }

    // Find the transaction by external ID or by internal matching
    let transaction = await this.prisma.bnplTransaction.findFirst({
      where: { tenantId, externalTransactionId },
    });

    // If not found by external ID, try matching by provider response
    if (!transaction) {
      // Attempt to match by the most recent initiated transaction for this provider
      const orderId = payload.orderId as string | undefined;
      if (orderId) {
        transaction = await this.prisma.bnplTransaction.findFirst({
          where: {
            tenantId,
            orderId,
            providerName: providerName as BnplProviderName,
            status: 'INITIATED',
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    }

    if (!transaction) {
      throw new NotFoundException('BNPL transaction not found for callback');
    }

    let newStatus: BnplTransactionStatus = transaction.status as BnplTransactionStatus;
    const updateData: Record<string, unknown> = {
      externalTransactionId: externalTransactionId ?? transaction.externalTransactionId,
      providerResponse: payload,
    };

    switch (status?.toUpperCase()) {
      case 'APPROVED':
      case 'SUCCESS':
        newStatus = BnplTransactionStatus.APPROVED;
        updateData.approvedAt = new Date();
        // Set the next due date from the first schedule entry
        const firstSchedule = await this.prisma.emiSchedule.findFirst({
          where: { transactionId: transaction.id, installmentNumber: 1 },
        });
        if (firstSchedule) {
          updateData.nextDueDate = firstSchedule.dueDate;
          // Mark first installment as DUE
          await this.prisma.emiSchedule.update({
            where: { id: firstSchedule.id },
            data: { status: 'DUE' },
          });
        }
        break;

      case 'ACTIVE':
        newStatus = BnplTransactionStatus.ACTIVE;
        break;

      case 'COMPLETED':
        newStatus = BnplTransactionStatus.COMPLETED;
        updateData.completedAt = new Date();
        break;

      case 'FAILED':
      case 'CANCELLED':
        newStatus = BnplTransactionStatus.CANCELLED;
        break;

      case 'DEFAULTED':
        newStatus = BnplTransactionStatus.DEFAULTED;
        break;

      default:
        this.logger.warn(`Unknown callback status: ${status} for transaction ${transaction.id}`);
    }

    updateData.status = newStatus;

    const updated = await this.prisma.bnplTransaction.update({
      where: { id: transaction.id },
      data: updateData,
    });

    this.logger.log(`BNPL callback processed: ${transaction.id} -> ${newStatus}`);

    return this.mapTransactionToResponse(updated);
  }

  // ─── Transaction Queries ──────────────────────────────────────

  async getTransaction(tenantId: string, transactionId: string): Promise<BnplTransactionResponse & { schedule: unknown[] }> {
    const transaction = await this.prisma.bnplTransaction.findFirst({
      where: { id: transactionId, tenantId },
      include: {
        emiSchedule: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('BNPL transaction not found');
    }

    const response = this.mapTransactionToResponse(transaction);
    const schedule = transaction.emiSchedule.map((s) => ({
      id: s.id,
      transactionId: s.transactionId,
      installmentNumber: s.installmentNumber,
      dueDate: s.dueDate,
      amountPaise: Number(s.amountPaise),
      principalPaise: Number(s.principalPaise),
      interestPaise: Number(s.interestPaise),
      status: s.status,
      paidAt: s.paidAt,
      paidAmountPaise: s.paidAmountPaise ? Number(s.paidAmountPaise) : null,
      lateFeePaise: Number(s.lateFeePaise),
    }));

    return { ...response, schedule };
  }

  async listTransactions(
    tenantId: string,
    filters: BnplTransactionListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<BnplTransactionResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.status) where.status = filters.status;
    if (filters.providerName) where.providerName = filters.providerName;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.orderId) where.orderId = filters.orderId;
    if (filters.search) {
      where.OR = [
        { orderId: { contains: filters.search } },
        { externalTransactionId: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.bnplTransaction.findMany({
        where,
        orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.bnplTransaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((t) => this.mapTransactionToResponse(t)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  // ─── Analytics ────────────────────────────────────────────────

  async getDashboardStats(tenantId: string) {
    const [
      totalTransactions,
      activeTransactions,
      completedTransactions,
      defaultedTransactions,
      overdueInstallments,
    ] = await Promise.all([
      this.prisma.bnplTransaction.count({ where: { tenantId } }),
      this.prisma.bnplTransaction.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.bnplTransaction.count({ where: { tenantId, status: 'COMPLETED' } }),
      this.prisma.bnplTransaction.count({ where: { tenantId, status: 'DEFAULTED' } }),
      this.prisma.emiSchedule.count({ where: { tenantId, status: 'OVERDUE' } }),
    ]);

    // Sum of active transaction amounts
    const activeAmountResult = await this.prisma.bnplTransaction.aggregate({
      where: { tenantId, status: 'ACTIVE' },
      _sum: { totalPayablePaise: true },
    });

    // Sum of collected EMI payments
    const collectedResult = await this.prisma.emiSchedule.aggregate({
      where: { tenantId, status: 'PAID' },
      _sum: { paidAmountPaise: true },
    });

    return {
      totalTransactions,
      activeTransactions,
      completedTransactions,
      defaultedTransactions,
      overdueInstallments,
      activeAmountPaise: Number(activeAmountResult._sum.totalPayablePaise ?? 0n),
      collectedPaise: Number(collectedResult._sum.paidAmountPaise ?? 0n),
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapProviderToResponse(p: Record<string, unknown>): BnplProviderResponse {
    return {
      id: p.id as string,
      tenantId: p.tenantId as string,
      providerName: p.providerName as BnplProviderName,
      displayName: p.displayName as string,
      isActive: p.isActive as boolean,
      minOrderPaise: Number(p.minOrderPaise),
      maxOrderPaise: Number(p.maxOrderPaise),
      supportedTenures: (p.supportedTenures as number[]) ?? [],
      processingFeePct: p.processingFeePct as number,
      settings: p.settings ?? null,
      createdAt: new Date(p.createdAt as string),
      updatedAt: new Date(p.updatedAt as string),
    };
  }

  private mapTransactionToResponse(t: Record<string, unknown>): BnplTransactionResponse {
    return {
      id: t.id as string,
      tenantId: t.tenantId as string,
      orderId: t.orderId as string,
      customerId: t.customerId as string,
      providerName: t.providerName as BnplProviderName,
      planId: (t.planId as string) ?? null,
      orderAmountPaise: Number(t.orderAmountPaise),
      emiAmountPaise: Number(t.emiAmountPaise),
      tenure: t.tenure as number,
      interestPaise: Number(t.interestPaise),
      processingFeePaise: Number(t.processingFeePaise),
      totalPayablePaise: Number(t.totalPayablePaise),
      status: t.status as BnplTransactionStatus,
      externalTransactionId: (t.externalTransactionId as string) ?? null,
      approvedAt: t.approvedAt ? new Date(t.approvedAt as string) : null,
      nextDueDate: t.nextDueDate ? new Date(t.nextDueDate as string) : null,
      completedAt: t.completedAt ? new Date(t.completedAt as string) : null,
      createdAt: new Date(t.createdAt as string),
      updatedAt: new Date(t.updatedAt as string),
    };
  }
}
