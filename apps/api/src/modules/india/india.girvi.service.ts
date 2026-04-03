// ─── India Girvi (Mortgage Lending) Service ───────────────────
// Create loans, accrue interest, record payments, handle defaults,
// schedule and record auctions, generate girvi register reports.

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { parsePagination, buildPaginatedResult } from '../../common/pagination.helper';
import type { Prisma } from '@caratflow/db';
import type {
  GirviLoanInput,
  GirviLoanListInput,
  GirviPaymentInput,
  GirviAuctionInput,
  GirviAuctionResultInput,
  GirviInterestCalcResult,
  GirviDashboardResponse,
} from '@caratflow/shared-types';

@Injectable()
export class IndiaGirviService extends TenantAwareService {
  private readonly logger = new Logger(IndiaGirviService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Loan Number Generation ──────────────────────────────────

  private async generateLoanNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const base = `GRV-${year}${month}`;

    const count = await this.prisma.girviLoan.count({
      where: { tenantId, loanNumber: { startsWith: base } },
    });

    return `${base}-${String(count + 1).padStart(4, '0')}`;
  }

  // ─── Create Loan ─────────────────────────────────────────────

  async createLoan(tenantId: string, userId: string, input: GirviLoanInput) {
    // Validate loan amount does not exceed appraised value
    if (input.loanAmountPaise > input.appraisedValuePaise) {
      throw new BadRequestException('Loan amount cannot exceed appraised value');
    }

    // Validate net weight does not exceed gross weight
    if (input.netWeightMg > input.grossWeightMg) {
      throw new BadRequestException('Net weight cannot exceed gross weight');
    }

    // Validate due date is after disbursed date
    if (input.dueDate <= input.disbursedDate) {
      throw new BadRequestException('Due date must be after disbursement date');
    }

    // Validate compounding period is set for compound interest
    if (input.interestType === 'COMPOUND' && !input.compoundingPeriod) {
      throw new BadRequestException('Compounding period is required for compound interest');
    }

    // Check KYC status for the customer
    const kycVerifications = await this.prisma.kycVerification.findMany({
      where: {
        tenantId,
        customerId: input.customerId,
        verificationStatus: 'VERIFIED',
      },
    });

    const aadhaarVerified = kycVerifications.some((v) => v.verificationType === 'AADHAAR');
    const panVerified = kycVerifications.some((v) => v.verificationType === 'PAN');

    if (!aadhaarVerified && !panVerified) {
      throw new BadRequestException(
        'At least one KYC document (Aadhaar or PAN) must be verified before creating a girvi loan',
      );
    }

    const loanNumber = await this.generateLoanNumber(tenantId);

    const loan = await this.prisma.girviLoan.create({
      data: {
        tenantId,
        loanNumber,
        customerId: input.customerId,
        locationId: input.locationId,
        status: 'ACTIVE',
        collateralDescription: input.collateralDescription,
        collateralImages: input.collateralImages ?? [],
        metalType: input.metalType,
        grossWeightMg: BigInt(input.grossWeightMg),
        netWeightMg: BigInt(input.netWeightMg),
        purityFineness: input.purityFineness,
        appraisedValuePaise: BigInt(input.appraisedValuePaise),
        loanAmountPaise: BigInt(input.loanAmountPaise),
        interestRate: input.interestRate,
        interestType: input.interestType,
        compoundingPeriod: input.compoundingPeriod ?? null,
        disbursedDate: input.disbursedDate,
        dueDate: input.dueDate,
        outstandingPrincipalPaise: BigInt(input.loanAmountPaise),
        outstandingInterestPaise: BigInt(0),
        aadhaarVerified,
        panVerified,
        notes: input.notes ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { customer: true, location: true },
    });

    this.logger.log(`Girvi loan created: ${loanNumber} for tenant ${tenantId}`);
    return loan;
  }

  // ─── Calculate Accrued Interest ──────────────────────────────

  calculateInterestForPeriod(
    principalPaise: number,
    annualRateBps: number,
    days: number,
    interestType: string,
    compoundingPeriod?: string | null,
  ): number {
    const dailyRate = annualRateBps / (365 * 10000); // annualRate is percent * 100

    if (interestType === 'SIMPLE') {
      return Math.round(principalPaise * dailyRate * days);
    }

    // Compound interest
    let periodsPerYear = 12; // default monthly
    if (compoundingPeriod === 'QUARTERLY') periodsPerYear = 4;
    if (compoundingPeriod === 'YEARLY') periodsPerYear = 1;

    const periodRate = annualRateBps / (periodsPerYear * 10000);
    const periods = (days / 365) * periodsPerYear;
    const compoundAmount = principalPaise * Math.pow(1 + periodRate, periods);
    return Math.round(compoundAmount - principalPaise);
  }

  async accrueInterest(tenantId: string, loanId: string): Promise<GirviInterestCalcResult> {
    const loan = await this.prisma.girviLoan.findFirst({
      where: this.tenantWhere(tenantId, { id: loanId, status: 'ACTIVE' }) as Prisma.GirviLoanWhereInput,
    });
    if (!loan) throw new NotFoundException('Active girvi loan not found');

    // Get last accrual date
    const lastAccrual = await this.prisma.girviInterestAccrual.findFirst({
      where: { girviLoanId: loanId },
      orderBy: { accrualDate: 'desc' },
    });

    const fromDate = lastAccrual
      ? new Date(lastAccrual.accrualDate.getTime() + 86400000) // day after last accrual
      : new Date(loan.disbursedDate);
    const toDate = new Date();

    const daysDiff = Math.max(
      1,
      Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000),
    );

    const principalPaise = Number(loan.outstandingPrincipalPaise);
    const rateBps = loan.interestRate;

    const interestPaise = this.calculateInterestForPeriod(
      principalPaise,
      rateBps,
      daysDiff,
      loan.interestType,
      loan.compoundingPeriod,
    );

    const cumulativeInterestPaise = Number(loan.outstandingInterestPaise) + interestPaise;

    // Record the accrual
    await this.prisma.girviInterestAccrual.create({
      data: {
        tenantId,
        girviLoanId: loanId,
        accrualDate: toDate,
        daysCalculated: daysDiff,
        principalPaise: BigInt(principalPaise),
        rateBps,
        interestPaise: BigInt(interestPaise),
        cumulativeInterestPaise: BigInt(cumulativeInterestPaise),
      },
    });

    // Update outstanding interest on the loan
    await this.prisma.girviLoan.update({
      where: { id: loanId },
      data: { outstandingInterestPaise: BigInt(cumulativeInterestPaise) },
    });

    return {
      principalPaise,
      rateBps,
      daysCalculated: daysDiff,
      interestPaise,
      cumulativeInterestPaise,
      outstandingTotalPaise: principalPaise + cumulativeInterestPaise,
    };
  }

  // ─── Record Payment ──────────────────────────────────────────

  async recordPayment(tenantId: string, userId: string, input: GirviPaymentInput) {
    const loan = await this.prisma.girviLoan.findFirst({
      where: this.tenantWhere(tenantId, {
        id: input.girviLoanId,
        status: { in: ['ACTIVE', 'PARTIALLY_PAID'] },
      }) as Prisma.GirviLoanWhereInput,
    });
    if (!loan) throw new NotFoundException('Active girvi loan not found');

    const totalPaise = input.principalPaise + input.interestPaise;

    // Allocate payment: interest first, then principal
    let interestPayment = input.interestPaise;
    let principalPayment = input.principalPaise;

    if (input.paymentType === 'CLOSURE') {
      // For closure, ensure full outstanding is covered
      const totalOutstanding =
        Number(loan.outstandingPrincipalPaise) + Number(loan.outstandingInterestPaise);
      if (totalPaise < totalOutstanding) {
        throw new BadRequestException(
          `Closure payment must cover full outstanding of ${totalOutstanding} paise. Provided: ${totalPaise} paise`,
        );
      }
      interestPayment = Number(loan.outstandingInterestPaise);
      principalPayment = Number(loan.outstandingPrincipalPaise);
    }

    // Create payment record
    const payment = await this.prisma.girviPayment.create({
      data: {
        tenantId,
        girviLoanId: input.girviLoanId,
        paymentDate: input.paymentDate,
        paymentType: input.paymentType,
        principalPaise: BigInt(principalPayment),
        interestPaise: BigInt(interestPayment),
        totalPaise: BigInt(totalPaise),
        method: input.method,
        reference: input.reference ?? null,
        receivedBy: input.receivedBy ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Update loan balances
    const newOutstandingPrincipal =
      Number(loan.outstandingPrincipalPaise) - principalPayment;
    const newOutstandingInterest =
      Number(loan.outstandingInterestPaise) - interestPayment;
    const newTotalPrincipalPaid =
      Number(loan.totalPrincipalPaidPaise) + principalPayment;
    const newTotalInterestPaid =
      Number(loan.totalInterestPaidPaise) + interestPayment;

    const isClosed = newOutstandingPrincipal <= 0 && newOutstandingInterest <= 0;
    const newStatus = isClosed
      ? 'CLOSED'
      : newOutstandingPrincipal < Number(loan.loanAmountPaise)
        ? 'PARTIALLY_PAID'
        : loan.status;

    await this.prisma.girviLoan.update({
      where: { id: input.girviLoanId },
      data: {
        outstandingPrincipalPaise: BigInt(Math.max(0, newOutstandingPrincipal)),
        outstandingInterestPaise: BigInt(Math.max(0, newOutstandingInterest)),
        totalPrincipalPaidPaise: BigInt(newTotalPrincipalPaid),
        totalInterestPaidPaise: BigInt(newTotalInterestPaid),
        status: newStatus as 'ACTIVE' | 'PARTIALLY_PAID' | 'CLOSED',
        closedDate: isClosed ? new Date() : null,
        updatedBy: userId,
      },
    });

    this.logger.log(
      `Girvi payment recorded: ${payment.id} for loan ${input.girviLoanId}, status: ${newStatus}`,
    );
    return payment;
  }

  // ─── Close Loan ──────────────────────────────────────────────

  async closeLoan(tenantId: string, userId: string, loanId: string) {
    const loan = await this.prisma.girviLoan.findFirst({
      where: this.tenantWhere(tenantId, { id: loanId }) as Prisma.GirviLoanWhereInput,
    });
    if (!loan) throw new NotFoundException('Girvi loan not found');

    const totalOutstanding =
      Number(loan.outstandingPrincipalPaise) + Number(loan.outstandingInterestPaise);
    if (totalOutstanding > 0) {
      throw new BadRequestException(
        `Loan cannot be closed with outstanding balance of ${totalOutstanding} paise`,
      );
    }

    return this.prisma.girviLoan.update({
      where: { id: loanId },
      data: {
        status: 'CLOSED',
        closedDate: new Date(),
        updatedBy: userId,
      },
      include: { customer: true },
    });
  }

  // ─── Default Handling ────────────────────────────────────────

  async markDefaulted(tenantId: string, userId: string, loanId: string) {
    const loan = await this.prisma.girviLoan.findFirst({
      where: this.tenantWhere(tenantId, { id: loanId, status: 'ACTIVE' }) as Prisma.GirviLoanWhereInput,
    });
    if (!loan) throw new NotFoundException('Active girvi loan not found');

    return this.prisma.girviLoan.update({
      where: { id: loanId },
      data: { status: 'DEFAULTED', updatedBy: userId },
      include: { customer: true },
    });
  }

  /**
   * BullMQ cron job: check for overdue loans and mark as defaulted.
   * Should run daily at midnight IST.
   */
  async processOverdueLoans(tenantId: string): Promise<number> {
    const graceDays = 30; // configurable per tenant
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - graceDays);

    const overdueLoans = await this.prisma.girviLoan.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        dueDate: { lt: cutoffDate },
      },
    });

    let defaultedCount = 0;
    for (const loan of overdueLoans) {
      await this.prisma.girviLoan.update({
        where: { id: loan.id },
        data: { status: 'DEFAULTED' },
      });
      defaultedCount++;
    }

    this.logger.log(`Processed ${defaultedCount} overdue loans for tenant ${tenantId}`);
    return defaultedCount;
  }

  /**
   * BullMQ cron job: accrue interest for all active loans daily.
   */
  async runDailyInterestAccrual(tenantId: string): Promise<number> {
    const activeLoans = await this.prisma.girviLoan.findMany({
      where: { tenantId, status: { in: ['ACTIVE', 'PARTIALLY_PAID'] } },
    });

    let accrued = 0;
    for (const loan of activeLoans) {
      try {
        await this.accrueInterest(tenantId, loan.id);
        accrued++;
      } catch (error) {
        this.logger.error(`Failed to accrue interest for loan ${loan.id}`, error);
      }
    }

    this.logger.log(`Daily interest accrual: processed ${accrued} loans for tenant ${tenantId}`);
    return accrued;
  }

  // ─── Auction Management ──────────────────────────────────────

  async scheduleAuction(tenantId: string, userId: string, input: GirviAuctionInput) {
    const loan = await this.prisma.girviLoan.findFirst({
      where: this.tenantWhere(tenantId, {
        id: input.girviLoanId,
        status: 'DEFAULTED',
      }) as Prisma.GirviLoanWhereInput,
    });
    if (!loan) throw new NotFoundException('Defaulted girvi loan not found');

    return this.prisma.girviAuction.create({
      data: {
        tenantId,
        girviLoanId: input.girviLoanId,
        auctionDate: input.auctionDate,
        reservePricePaise: BigInt(input.reservePricePaise),
        status: 'SCHEDULED',
        notes: input.notes ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { girviLoan: { include: { customer: true } } },
    });
  }

  async recordAuctionResult(tenantId: string, userId: string, input: GirviAuctionResultInput) {
    const auction = await this.prisma.girviAuction.findFirst({
      where: this.tenantWhere(tenantId, {
        id: input.auctionId,
        status: 'SCHEDULED',
      }) as Prisma.GirviAuctionWhereInput,
    });
    if (!auction) throw new NotFoundException('Scheduled auction not found');

    const updatedAuction = await this.prisma.girviAuction.update({
      where: { id: input.auctionId },
      data: {
        soldPricePaise: BigInt(input.soldPricePaise),
        buyerName: input.buyerName,
        buyerPhone: input.buyerPhone ?? null,
        status: 'COMPLETED',
        updatedBy: userId,
      },
    });

    // Mark the loan as auctioned
    await this.prisma.girviLoan.update({
      where: { id: auction.girviLoanId },
      data: { status: 'AUCTIONED', closedDate: new Date(), updatedBy: userId },
    });

    return updatedAuction;
  }

  async cancelAuction(tenantId: string, userId: string, auctionId: string) {
    const auction = await this.prisma.girviAuction.findFirst({
      where: this.tenantWhere(tenantId, {
        id: auctionId,
        status: 'SCHEDULED',
      }) as Prisma.GirviAuctionWhereInput,
    });
    if (!auction) throw new NotFoundException('Scheduled auction not found');

    return this.prisma.girviAuction.update({
      where: { id: auctionId },
      data: { status: 'CANCELLED', updatedBy: userId },
    });
  }

  // ─── Queries ─────────────────────────────────────────────────

  async getLoan(tenantId: string, id: string) {
    const loan = await this.prisma.girviLoan.findFirst({
      where: this.tenantWhere(tenantId, { id }) as Prisma.GirviLoanWhereInput,
      include: {
        customer: true,
        location: true,
        payments: { orderBy: { paymentDate: 'desc' } },
        accruals: { orderBy: { accrualDate: 'desc' }, take: 30 },
        auctions: { orderBy: { auctionDate: 'desc' } },
      },
    });
    if (!loan) throw new NotFoundException('Girvi loan not found');
    return loan;
  }

  async listLoans(tenantId: string, input: GirviLoanListInput) {
    const { skip, take, orderBy, page, limit } = parsePagination(input);

    const where: Prisma.GirviLoanWhereInput = { tenantId };
    if (input.status) where.status = input.status;
    if (input.customerId) where.customerId = input.customerId;
    if (input.overdueOnly) {
      where.dueDate = { lt: new Date() };
      where.status = { in: ['ACTIVE', 'PARTIALLY_PAID'] };
    }
    if (input.dateRange) {
      where.disbursedDate = { gte: input.dateRange.from, lte: input.dateRange.to };
    }
    if (input.search) {
      where.OR = [
        { loanNumber: { contains: input.search } },
        { collateralDescription: { contains: input.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.girviLoan.findMany({
        where,
        skip,
        take,
        orderBy: orderBy ?? { createdAt: 'desc' },
        include: { customer: true, location: true },
      }),
      this.prisma.girviLoan.count({ where }),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  async listAuctions(tenantId: string, status?: string) {
    const where: Prisma.GirviAuctionWhereInput = { tenantId };
    if (status) where.status = status as 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

    return this.prisma.girviAuction.findMany({
      where,
      include: { girviLoan: { include: { customer: true } } },
      orderBy: { auctionDate: 'asc' },
    });
  }

  // ─── Dashboard ───────────────────────────────────────────────

  async getDashboard(tenantId: string): Promise<GirviDashboardResponse> {
    const now = new Date();

    const [activeCount, overdueCount, upcomingAuctionCount, activeLoans] = await Promise.all([
      this.prisma.girviLoan.count({
        where: { tenantId, status: { in: ['ACTIVE', 'PARTIALLY_PAID'] } },
      }),
      this.prisma.girviLoan.count({
        where: {
          tenantId,
          status: { in: ['ACTIVE', 'PARTIALLY_PAID'] },
          dueDate: { lt: now },
        },
      }),
      this.prisma.girviAuction.count({
        where: { tenantId, status: 'SCHEDULED' },
      }),
      this.prisma.girviLoan.findMany({
        where: { tenantId, status: { in: ['ACTIVE', 'PARTIALLY_PAID'] } },
        select: {
          outstandingPrincipalPaise: true,
          outstandingInterestPaise: true,
        },
      }),
    ]);

    const totalPrincipalOutstandingPaise = activeLoans.reduce(
      (sum, l) => sum + Number(l.outstandingPrincipalPaise),
      0,
    );
    const totalInterestAccruedPaise = activeLoans.reduce(
      (sum, l) => sum + Number(l.outstandingInterestPaise),
      0,
    );

    const recentLoansRaw = await this.prisma.girviLoan.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { customer: true },
    });

    const recentLoans = recentLoansRaw.map((l) => ({
      id: l.id,
      loanNumber: l.loanNumber,
      customerId: l.customerId,
      customerName: `${l.customer.firstName} ${l.customer.lastName}`,
      locationId: l.locationId,
      status: l.status as 'ACTIVE',
      collateralDescription: l.collateralDescription,
      metalType: l.metalType,
      grossWeightMg: Number(l.grossWeightMg),
      netWeightMg: Number(l.netWeightMg),
      purityFineness: l.purityFineness,
      appraisedValuePaise: Number(l.appraisedValuePaise),
      loanAmountPaise: Number(l.loanAmountPaise),
      interestRate: l.interestRate,
      interestType: l.interestType as 'SIMPLE',
      disbursedDate: l.disbursedDate.toISOString(),
      dueDate: l.dueDate.toISOString(),
      closedDate: l.closedDate?.toISOString() ?? null,
      outstandingPrincipalPaise: Number(l.outstandingPrincipalPaise),
      outstandingInterestPaise: Number(l.outstandingInterestPaise),
      totalInterestPaidPaise: Number(l.totalInterestPaidPaise),
      totalPrincipalPaidPaise: Number(l.totalPrincipalPaidPaise),
      aadhaarVerified: l.aadhaarVerified,
      panVerified: l.panVerified,
      createdAt: l.createdAt.toISOString(),
    }));

    return {
      activeLoans: activeCount,
      totalPrincipalOutstandingPaise,
      totalInterestAccruedPaise,
      overdueLoans: overdueCount,
      upcomingAuctions: upcomingAuctionCount,
      recentLoans,
    };
  }
}
