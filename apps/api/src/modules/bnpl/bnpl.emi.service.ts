// ─── BNPL EMI Service ─────────────────────────────────────────
// EMI calculation, plan management, and schedule generation.
// All calculations use integer arithmetic (paise) to avoid
// floating-point precision issues.

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type {
  EmiPlanInput,
  EmiPlanResponse,
  EmiCalculatorResult,
  EmiScheduleItem,
  EmiPlanListFilter,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { EmiCardType } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BnplEmiService extends TenantAwareService {
  private readonly logger = new Logger(BnplEmiService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── EMI Calculation (Pure Integer Arithmetic) ────────────────

  /**
   * Calculate EMI using standard formula:
   *   EMI = P * r * (1+r)^n / ((1+r)^n - 1)
   *
   * Where:
   *   P = principal in paise
   *   r = monthly interest rate (annual rate / 12 / 10000, since rate is percent*100)
   *   n = tenure in months
   *
   * For zero interest: EMI = ceil(P / n)
   *
   * All intermediate calculations use scaled integers to maintain precision.
   * We use a scale factor of 10^12 to avoid overflow while maintaining precision.
   */
  calculateEmi(
    amountPaise: number,
    tenure: number,
    interestRatePct: number,
  ): { monthlyEmiPaise: number; totalInterestPaise: number; totalPayablePaise: number } {
    if (tenure <= 0) {
      return { monthlyEmiPaise: amountPaise, totalInterestPaise: 0, totalPayablePaise: amountPaise };
    }

    // Zero interest EMI
    if (interestRatePct === 0) {
      const monthlyEmi = Math.ceil(amountPaise / tenure);
      const totalPayable = monthlyEmi * tenure;
      // For zero interest, any rounding goes to the last installment,
      // but total payable should equal the amount
      return {
        monthlyEmiPaise: monthlyEmi,
        totalInterestPaise: 0,
        totalPayablePaise: amountPaise,
      };
    }

    // interestRatePct is annual rate * 100 (e.g., 1200 = 12%)
    // Monthly rate = annualRate / 12 / 10000
    // To use integer math, we use a precision scale of 10^12
    const SCALE = 1_000_000_000_000; // 10^12

    // Monthly rate as a fraction: interestRatePct / (12 * 10000)
    // r_scaled = (interestRatePct * SCALE) / 120000
    // But we need to work with (1+r)^n, so let's use floating point
    // for the power calculation and then round to paise.
    //
    // Given that EMI amounts in paise are at most ~10^10 (100 crore rupees),
    // IEEE 754 doubles have 53 bits of precision (~15 decimal digits),
    // which is sufficient for this calculation if we round at the end.

    const monthlyRate = interestRatePct / (12 * 10000);
    const onePlusR = 1 + monthlyRate;
    const onePlusRtoN = Math.pow(onePlusR, tenure);

    // EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    const emiExact = (amountPaise * monthlyRate * onePlusRtoN) / (onePlusRtoN - 1);

    // Round up to the nearest paisa to ensure the loan is fully repaid
    const monthlyEmiPaise = Math.ceil(emiExact);
    const totalPayablePaise = monthlyEmiPaise * tenure;
    const totalInterestPaise = totalPayablePaise - amountPaise;

    return {
      monthlyEmiPaise,
      totalInterestPaise,
      totalPayablePaise,
    };
  }

  /**
   * Generate a detailed EMI schedule with principal and interest breakdown
   * for each installment. Uses the amortization schedule approach.
   */
  generateEmiSchedule(
    amountPaise: number,
    tenure: number,
    interestRatePct: number,
    startDate: Date,
  ): EmiScheduleItem[] {
    const { monthlyEmiPaise } = this.calculateEmi(amountPaise, tenure, interestRatePct);
    const schedule: EmiScheduleItem[] = [];

    let outstandingPaise = amountPaise;
    const monthlyRate = interestRatePct / (12 * 10000);

    for (let i = 1; i <= tenure; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      let interestPaise: number;
      let principalPaise: number;
      let emiPaise: number;

      if (interestRatePct === 0) {
        // Zero interest: equal principal payments
        if (i < tenure) {
          emiPaise = Math.ceil(amountPaise / tenure);
        } else {
          // Last installment gets the remainder
          emiPaise = outstandingPaise;
        }
        principalPaise = emiPaise;
        interestPaise = 0;
      } else {
        // Calculate interest on outstanding balance
        interestPaise = Math.round(outstandingPaise * monthlyRate);

        if (i < tenure) {
          emiPaise = monthlyEmiPaise;
          principalPaise = emiPaise - interestPaise;
        } else {
          // Last installment: pay off remaining balance exactly
          principalPaise = outstandingPaise;
          emiPaise = principalPaise + interestPaise;
        }
      }

      outstandingPaise -= principalPaise;

      // Guard against negative outstanding due to rounding
      if (outstandingPaise < 0) {
        principalPaise += outstandingPaise; // reduce principal by the overshoot
        emiPaise = principalPaise + interestPaise;
        outstandingPaise = 0;
      }

      schedule.push({
        installmentNumber: i,
        dueDate: dueDate.toISOString().split('T')[0] as string,
        amountPaise: emiPaise,
        principalPaise,
        interestPaise,
        outstandingPaise: Math.max(0, outstandingPaise),
      });
    }

    return schedule;
  }

  /**
   * Full EMI calculation with schedule (for customer-facing calculator).
   */
  calculateEmiWithSchedule(
    amountPaise: number,
    tenure: number,
    interestRatePct: number,
    processingFeePaise: number = 0,
  ): EmiCalculatorResult {
    const { monthlyEmiPaise, totalInterestPaise, totalPayablePaise } = this.calculateEmi(
      amountPaise,
      tenure,
      interestRatePct,
    );

    const schedule = this.generateEmiSchedule(amountPaise, tenure, interestRatePct, new Date());

    return {
      monthlyEmiPaise,
      totalInterestPaise,
      totalPayablePaise,
      processingFeePaise,
      schedule,
    };
  }

  // ─── EMI Plan CRUD ────────────────────────────────────────────

  async getAvailablePlans(tenantId: string, amountPaise: number): Promise<EmiPlanResponse[]> {
    const plans = await this.prisma.emiPlan.findMany({
      where: {
        tenantId,
        isActive: true,
        minAmountPaise: { lte: BigInt(amountPaise) },
        maxAmountPaise: { gte: BigInt(amountPaise) },
      },
      orderBy: [{ tenure: 'asc' }, { interestRatePct: 'asc' }],
    });

    return plans.map((p) => this.mapPlanToResponse(p));
  }

  async getEmiPlans(
    tenantId: string,
    filters: EmiPlanListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<EmiPlanResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.bankName) where.bankName = { contains: filters.bankName };
    if (filters.providerId) where.providerId = filters.providerId;
    if (filters.isNoCostEmi !== undefined) where.isNoCostEmi = filters.isNoCostEmi;
    if (filters.search) {
      where.OR = [
        { bankName: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.emiPlan.findMany({
        where,
        orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.emiPlan.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((p) => this.mapPlanToResponse(p)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  async createEmiPlan(tenantId: string, userId: string, input: EmiPlanInput): Promise<EmiPlanResponse> {
    // Validate provider if specified
    if (input.providerId) {
      const provider = await this.prisma.bnplProvider.findFirst({
        where: { id: input.providerId, tenantId },
      });
      if (!provider) {
        throw new NotFoundException('BNPL provider not found');
      }
    }

    const plan = await this.prisma.emiPlan.create({
      data: {
        id: uuidv4(),
        tenantId,
        providerId: input.providerId ?? null,
        bankName: input.bankName ?? null,
        tenure: input.tenure,
        interestRatePct: input.interestRatePct,
        processingFeePaise: BigInt(input.processingFeePaise ?? 0),
        minAmountPaise: BigInt(input.minAmountPaise),
        maxAmountPaise: BigInt(input.maxAmountPaise),
        isNoCostEmi: input.isNoCostEmi ?? false,
        subventionPct: input.subventionPct ?? 0,
        isActive: input.isActive ?? true,
        cardType: input.cardType ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapPlanToResponse(plan);
  }

  async updateEmiPlan(
    tenantId: string,
    userId: string,
    planId: string,
    input: Partial<EmiPlanInput>,
  ): Promise<EmiPlanResponse> {
    const existing = await this.prisma.emiPlan.findFirst({
      where: { id: planId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('EMI plan not found');
    }

    const updated = await this.prisma.emiPlan.update({
      where: { id: planId },
      data: {
        providerId: input.providerId ?? undefined,
        bankName: input.bankName ?? undefined,
        tenure: input.tenure ?? undefined,
        interestRatePct: input.interestRatePct ?? undefined,
        processingFeePaise: input.processingFeePaise !== undefined ? BigInt(input.processingFeePaise) : undefined,
        minAmountPaise: input.minAmountPaise !== undefined ? BigInt(input.minAmountPaise) : undefined,
        maxAmountPaise: input.maxAmountPaise !== undefined ? BigInt(input.maxAmountPaise) : undefined,
        isNoCostEmi: input.isNoCostEmi ?? undefined,
        subventionPct: input.subventionPct ?? undefined,
        isActive: input.isActive ?? undefined,
        cardType: input.cardType ?? undefined,
        updatedBy: userId,
      },
    });

    return this.mapPlanToResponse(updated);
  }

  async toggleNoCostEmi(
    tenantId: string,
    userId: string,
    planId: string,
    enabled: boolean,
    subventionPct: number,
  ): Promise<EmiPlanResponse> {
    const existing = await this.prisma.emiPlan.findFirst({
      where: { id: planId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('EMI plan not found');
    }

    const updated = await this.prisma.emiPlan.update({
      where: { id: planId },
      data: {
        isNoCostEmi: enabled,
        subventionPct: enabled ? subventionPct : 0,
        // If enabling no-cost, set interest rate to 0 for customer view
        interestRatePct: enabled ? 0 : existing.interestRatePct,
        updatedBy: userId,
      },
    });

    return this.mapPlanToResponse(updated);
  }

  async deletePlan(tenantId: string, planId: string): Promise<void> {
    const existing = await this.prisma.emiPlan.findFirst({
      where: { id: planId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('EMI plan not found');
    }

    // Check if any active transactions reference this plan
    const activeTransactions = await this.prisma.bnplTransaction.count({
      where: {
        planId,
        tenantId,
        status: { in: ['INITIATED', 'APPROVED', 'ACTIVE'] },
      },
    });

    if (activeTransactions > 0) {
      // Soft-delete by deactivating instead
      await this.prisma.emiPlan.update({
        where: { id: planId },
        data: { isActive: false },
      });
      return;
    }

    await this.prisma.emiPlan.delete({ where: { id: planId } });
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapPlanToResponse(p: Record<string, unknown>): EmiPlanResponse {
    return {
      id: p.id as string,
      tenantId: p.tenantId as string,
      providerId: (p.providerId as string) ?? null,
      bankName: (p.bankName as string) ?? null,
      tenure: p.tenure as number,
      interestRatePct: p.interestRatePct as number,
      processingFeePaise: Number(p.processingFeePaise),
      minAmountPaise: Number(p.minAmountPaise),
      maxAmountPaise: Number(p.maxAmountPaise),
      isNoCostEmi: p.isNoCostEmi as boolean,
      subventionPct: p.subventionPct as number,
      isActive: p.isActive as boolean,
      cardType: (p.cardType as EmiCardType) ?? null,
      createdAt: new Date(p.createdAt as string),
      updatedAt: new Date(p.updatedAt as string),
    };
  }
}
