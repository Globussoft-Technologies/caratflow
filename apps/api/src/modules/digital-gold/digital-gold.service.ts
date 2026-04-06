// ─── Digital Gold Core Service ─────────────────────────────────
// Buy, sell, vault management, portfolio, and transaction history.

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { IndiaRatesService } from '../india/india.rates.service';
import { IndiaKycService } from '../india/india.kyc.service';
import type { Prisma } from '@caratflow/db';
import type {
  BuyGoldInput,
  BuyGoldResponse,
  SellGoldInput,
  SellGoldResponse,
  GoldVaultResponse,
  GoldPortfolioResponse,
  GoldTransactionResponse,
  GoldTransactionListInput,
  GoldTransactionType,
  GoldTransactionStatus,
} from '@caratflow/shared-types';
import type { PaginatedResult } from '@caratflow/shared-types';

/** Minimum buy: Rs. 100 = 10000 paise */
const MIN_BUY_AMOUNT_PAISE = 10_000;
/** Minimum buy: 0.001g = 1 mg */
const MIN_BUY_WEIGHT_MG = 1;
/** Default buy spread: Rs. 50 per 10g = 5000 paise */
const BUY_SPREAD_PER_10G_PAISE = 5_000;
/** Default sell spread: -Rs. 50 per 10g = -5000 paise */
const SELL_SPREAD_PER_10G_PAISE = -5_000;
/** Gold purity for digital gold (999 = 24K fine gold) */
const DIGITAL_GOLD_PURITY = 999;

@Injectable()
export class DigitalGoldService extends TenantAwareService {
  private readonly logger = new Logger(DigitalGoldService.name);

  constructor(
    prisma: PrismaService,
    private readonly ratesService: IndiaRatesService,
    private readonly kycService: IndiaKycService,
  ) {
    super(prisma);
  }

  // ─── Buy Gold ─────────────────────────────────────────────────

  async buyGold(
    tenantId: string,
    customerId: string,
    input: BuyGoldInput,
  ): Promise<BuyGoldResponse> {
    await this.ensureKycVerified(tenantId, customerId);

    const vault = await this.getOrCreateVault(tenantId, customerId);
    const liveRate = await this.ratesService.getCurrentRate('GOLD', DIGITAL_GOLD_PURITY);

    // Apply buy spread (customer pays slightly more)
    const buyPricePer10gPaise = liveRate.ratePer10gPaise + BUY_SPREAD_PER_10G_PAISE;
    const buyPricePerGramPaise = Math.round(buyPricePer10gPaise / 10);

    let amountPaise: number;
    let goldWeightMg: number;

    if (input.amountPaise) {
      // Fixed amount: calculate weight
      amountPaise = input.amountPaise;
      if (amountPaise < MIN_BUY_AMOUNT_PAISE) {
        throw new BadRequestException(
          `Minimum buy amount is ${MIN_BUY_AMOUNT_PAISE} paise (Rs. ${MIN_BUY_AMOUNT_PAISE / 100})`,
        );
      }
      // weight(mg) = amountPaise * 1000 / pricePerGramPaise
      goldWeightMg = Math.floor((amountPaise * 1000) / buyPricePerGramPaise);
      if (goldWeightMg < MIN_BUY_WEIGHT_MG) {
        throw new BadRequestException('Calculated gold weight is below minimum (0.001g)');
      }
    } else if (input.weightMg) {
      // Fixed weight: calculate amount
      goldWeightMg = input.weightMg;
      if (goldWeightMg < MIN_BUY_WEIGHT_MG) {
        throw new BadRequestException('Minimum buy weight is 1 mg (0.001g)');
      }
      // amount(paise) = weightMg * pricePerGramPaise / 1000
      amountPaise = Math.ceil((goldWeightMg * buyPricePerGramPaise) / 1000);
      if (amountPaise < MIN_BUY_AMOUNT_PAISE) {
        throw new BadRequestException(
          `Calculated amount ${amountPaise} paise is below minimum Rs. ${MIN_BUY_AMOUNT_PAISE / 100}`,
        );
      }
    } else {
      throw new BadRequestException('Either amountPaise or weightMg must be provided');
    }

    // Create transaction and update vault atomically
    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.goldTransaction.create({
        data: {
          tenantId,
          vaultId: vault.id,
          transactionType: 'BUY',
          amountPaise: BigInt(amountPaise),
          goldWeightMg: BigInt(goldWeightMg),
          pricePerGramPaise: BigInt(buyPricePerGramPaise),
          pricePer10gPaise: BigInt(buyPricePer10gPaise),
          status: 'COMPLETED',
          paymentMethod: input.paymentMethod,
          reference: `DG-BUY-${Date.now()}`,
          processedAt: new Date(),
        },
      });

      // Update vault: add gold, update invested total, recalculate avg price
      const currentBalance = Number(vault.balanceMg);
      const currentInvested = Number(vault.totalInvestedPaise);
      const newBalance = currentBalance + goldWeightMg;
      const newInvested = currentInvested + amountPaise;

      // Weighted average buy price per 10g
      let newAvgPricePer10g: number;
      if (newBalance === 0) {
        newAvgPricePer10g = 0;
      } else {
        // totalCost / totalWeightIn10gUnits
        newAvgPricePer10g = Math.round((newInvested * 10_000) / newBalance);
      }

      const updatedVault = await tx.goldVault.update({
        where: { id: vault.id },
        data: {
          balanceMg: BigInt(newBalance),
          totalInvestedPaise: BigInt(newInvested),
          avgBuyPricePer10gPaise: BigInt(newAvgPricePer10g),
        },
      });

      return { transaction, updatedVault };
    });

    this.logger.log(
      `Gold bought: customer=${customerId}, amount=${amountPaise}p, weight=${goldWeightMg}mg`,
    );

    return {
      transactionId: result.transaction.id,
      goldWeightMg,
      amountPaise,
      pricePerGramPaise: buyPricePerGramPaise,
      pricePer10gPaise: buyPricePer10gPaise,
      newBalanceMg: Number(result.updatedVault.balanceMg),
      status: 'COMPLETED' as GoldTransactionStatus,
    };
  }

  // ─── Sell Gold ────────────────────────────────────────────────

  async sellGold(
    tenantId: string,
    customerId: string,
    input: SellGoldInput,
  ): Promise<SellGoldResponse> {
    await this.ensureKycVerified(tenantId, customerId);

    const vault = await this.getExistingVault(tenantId, customerId);
    const currentBalance = Number(vault.balanceMg);

    if (input.weightMg > currentBalance) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${currentBalance} mg, requested: ${input.weightMg} mg`,
      );
    }

    const liveRate = await this.ratesService.getCurrentRate('GOLD', DIGITAL_GOLD_PURITY);

    // Apply sell spread (customer receives slightly less)
    const sellPricePer10gPaise = liveRate.ratePer10gPaise + SELL_SPREAD_PER_10G_PAISE;
    const sellPricePerGramPaise = Math.round(sellPricePer10gPaise / 10);

    // amount(paise) = weightMg * pricePerGramPaise / 1000
    const amountPaise = Math.floor((input.weightMg * sellPricePerGramPaise) / 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.goldTransaction.create({
        data: {
          tenantId,
          vaultId: vault.id,
          transactionType: 'SELL',
          amountPaise: BigInt(amountPaise),
          goldWeightMg: BigInt(input.weightMg),
          pricePerGramPaise: BigInt(sellPricePerGramPaise),
          pricePer10gPaise: BigInt(sellPricePer10gPaise),
          status: 'COMPLETED',
          paymentMethod: null,
          reference: `DG-SELL-${Date.now()}`,
          processedAt: new Date(),
        },
      });

      const newBalance = currentBalance - input.weightMg;
      const newTotalSold = Number(vault.totalSoldPaise) + amountPaise;

      const updatedVault = await tx.goldVault.update({
        where: { id: vault.id },
        data: {
          balanceMg: BigInt(newBalance),
          totalSoldPaise: BigInt(newTotalSold),
        },
      });

      return { transaction, updatedVault };
    });

    this.logger.log(
      `Gold sold: customer=${customerId}, weight=${input.weightMg}mg, amount=${amountPaise}p`,
    );

    return {
      transactionId: result.transaction.id,
      goldWeightMg: input.weightMg,
      amountPaise,
      pricePerGramPaise: sellPricePerGramPaise,
      pricePer10gPaise: sellPricePer10gPaise,
      newBalanceMg: Number(result.updatedVault.balanceMg),
      status: 'COMPLETED' as GoldTransactionStatus,
    };
  }

  // ─── Get Vault ────────────────────────────────────────────────

  async getVault(tenantId: string, customerId: string): Promise<GoldVaultResponse> {
    const vault = await this.getExistingVault(tenantId, customerId);
    return this.toVaultResponse(vault);
  }

  // ─── Get Portfolio ────────────────────────────────────────────

  async getPortfolio(tenantId: string, customerId: string): Promise<GoldPortfolioResponse> {
    const vault = await this.getExistingVault(tenantId, customerId);
    const vaultResponse = await this.toVaultResponse(vault);

    // Recent transactions (last 20)
    const transactions = await this.prisma.goldTransaction.findMany({
      where: { tenantId, vaultId: vault.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Active SIPs
    const sips = await this.prisma.goldSip.findMany({
      where: { tenantId, vaultId: vault.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    // Pending redemptions
    const redemptions = await this.prisma.goldRedemption.findMany({
      where: {
        tenantId,
        vaultId: vault.id,
        status: { in: ['REQUESTED', 'PROCESSING', 'SHIPPED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Performance chart: monthly aggregation of last 12 months
    const performanceChart = await this.buildPerformanceChart(tenantId, vault.id);

    return {
      vault: vaultResponse,
      recentTransactions: transactions.map(this.toTransactionResponse),
      activeSips: sips.map((sip) => ({
        id: sip.id,
        vaultId: sip.vaultId,
        customerId: sip.customerId,
        sipType: sip.sipType as unknown as import('@caratflow/shared-types').GoldSipType,
        amountPaise: sip.amountPaise ? Number(sip.amountPaise) : null,
        weightMg: sip.weightMg ? Number(sip.weightMg) : null,
        frequency: sip.frequency as unknown as import('@caratflow/shared-types').GoldSipFrequency,
        dayOfMonth: sip.dayOfMonth,
        dayOfWeek: sip.dayOfWeek,
        status: sip.status as unknown as import('@caratflow/shared-types').GoldSipStatus,
        startDate: sip.startDate.toISOString(),
        endDate: sip.endDate?.toISOString() ?? null,
        nextDeductionDate: sip.nextDeductionDate.toISOString(),
        totalDeductions: sip.totalDeductions,
        failedDeductions: sip.failedDeductions,
        paymentMethod: sip.paymentMethod,
        createdAt: sip.createdAt.toISOString(),
      })),
      pendingRedemptions: redemptions.map((r) => ({
        redemptionId: r.id,
        redemptionType: r.redemptionType as unknown as import('@caratflow/shared-types').GoldRedemptionType,
        goldWeightMg: Number(r.goldWeightMg),
        valuePaise: Number(r.valuePaise),
        status: r.status as unknown as import('@caratflow/shared-types').GoldRedemptionStatus,
        newBalanceMg: Number(vault.balanceMg), // current balance
      })),
      performanceChart,
    };
  }

  // ─── Transaction History ──────────────────────────────────────

  async getTransactionHistory(
    tenantId: string,
    customerId: string,
    input: GoldTransactionListInput,
  ): Promise<PaginatedResult<GoldTransactionResponse>> {
    const vault = await this.getExistingVault(tenantId, customerId);

    const where: Prisma.GoldTransactionWhereInput = {
      tenantId,
      vaultId: vault.id,
    };

    if (input.transactionType) {
      where.transactionType = input.transactionType;
    }
    if (input.status) {
      where.status = input.status;
    }
    if (input.dateRange) {
      where.createdAt = { gte: input.dateRange.from, lte: input.dateRange.to };
    }

    const [items, total] = await Promise.all([
      this.prisma.goldTransaction.findMany({
        where,
        orderBy: { createdAt: input.sortOrder === 'asc' ? 'asc' : 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.goldTransaction.count({ where }),
    ]);

    const totalPages = Math.ceil(total / input.limit);

    return {
      items: items.map(this.toTransactionResponse),
      total,
      page: input.page,
      limit: input.limit,
      totalPages,
      hasNext: input.page < totalPages,
      hasPrevious: input.page > 1,
    };
  }

  // ─── Get Current Rates (pass-through) ─────────────────────────

  async getCurrentRates() {
    const rate = await this.ratesService.getCurrentRate('GOLD', DIGITAL_GOLD_PURITY);
    return {
      ...rate,
      buyPricePer10gPaise: rate.ratePer10gPaise + BUY_SPREAD_PER_10G_PAISE,
      sellPricePer10gPaise: rate.ratePer10gPaise + SELL_SPREAD_PER_10G_PAISE,
      buyPricePerGramPaise: Math.round((rate.ratePer10gPaise + BUY_SPREAD_PER_10G_PAISE) / 10),
      sellPricePerGramPaise: Math.round((rate.ratePer10gPaise + SELL_SPREAD_PER_10G_PAISE) / 10),
    };
  }

  // ─── Dashboard (admin) ────────────────────────────────────────

  async getDashboard(tenantId: string): Promise<import('@caratflow/shared-types').DigitalGoldDashboardResponse> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      vaultAggregation,
      activeSips,
      todayTransactions,
      todayBuyVolume,
      todaySellVolume,
    ] = await Promise.all([
      this.prisma.goldVault.count({ where: { tenantId, isActive: true } }),
      this.prisma.goldVault.aggregate({
        where: { tenantId, isActive: true },
        _sum: { balanceMg: true, totalInvestedPaise: true },
      }),
      this.prisma.goldSip.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.goldTransaction.count({
        where: { tenantId, createdAt: { gte: todayStart }, status: 'COMPLETED' },
      }),
      this.prisma.goldTransaction.aggregate({
        where: {
          tenantId,
          transactionType: 'BUY',
          status: 'COMPLETED',
          createdAt: { gte: todayStart },
        },
        _sum: { amountPaise: true },
      }),
      this.prisma.goldTransaction.aggregate({
        where: {
          tenantId,
          transactionType: 'SELL',
          status: 'COMPLETED',
          createdAt: { gte: todayStart },
        },
        _sum: { amountPaise: true },
      }),
    ]);

    const totalGoldHeldMg = Number(vaultAggregation._sum.balanceMg ?? 0n);
    const totalAumPaise = Number(vaultAggregation._sum.totalInvestedPaise ?? 0n);

    return {
      totalCustomers,
      totalGoldHeldMg,
      totalGoldHeldGrams: totalGoldHeldMg / 1000,
      totalAumPaise,
      activeSips,
      totalTransactionsToday: todayTransactions,
      totalBuyVolumeTodayPaise: Number(todayBuyVolume._sum.amountPaise ?? 0n),
      totalSellVolumeTodayPaise: Number(todaySellVolume._sum.amountPaise ?? 0n),
    };
  }

  // ─── Internal Helpers ─────────────────────────────────────────

  /** Ensure customer has completed KYC (regulatory requirement) */
  private async ensureKycVerified(tenantId: string, customerId: string): Promise<void> {
    const isComplete = await this.kycService.isKycComplete(tenantId, customerId);
    if (!isComplete) {
      throw new ForbiddenException(
        'KYC verification is mandatory before any digital gold transaction. ' +
        'Please complete Aadhaar and PAN verification first.',
      );
    }
  }

  /** Get or create a gold vault for the customer */
  async getOrCreateVault(tenantId: string, customerId: string) {
    let vault = await this.prisma.goldVault.findUnique({
      where: { tenantId_customerId: { tenantId, customerId } },
    });

    if (!vault) {
      const kycStatus = await this.kycService.getCustomerKycStatus(tenantId, customerId);
      vault = await this.prisma.goldVault.create({
        data: {
          tenantId,
          customerId,
          kycVerified: kycStatus.isKycComplete,
          isActive: true,
        },
      });
      this.logger.log(`Gold vault created for customer ${customerId}`);
    }

    return vault;
  }

  /** Get an existing vault or throw */
  private async getExistingVault(tenantId: string, customerId: string) {
    const vault = await this.prisma.goldVault.findUnique({
      where: { tenantId_customerId: { tenantId, customerId } },
    });

    if (!vault) {
      throw new NotFoundException('Gold vault not found. Please make your first purchase.');
    }

    if (!vault.isActive) {
      throw new ForbiddenException('Gold vault is deactivated. Contact support.');
    }

    return vault;
  }

  /** Convert vault record to response with current market valuation */
  private async toVaultResponse(vault: {
    id: string;
    customerId: string;
    balanceMg: bigint;
    totalInvestedPaise: bigint;
    totalSoldPaise: bigint;
    avgBuyPricePer10gPaise: bigint;
    kycVerified: boolean;
    isActive: boolean;
  }): Promise<GoldVaultResponse> {
    const balanceMg = Number(vault.balanceMg);
    const totalInvestedPaise = Number(vault.totalInvestedPaise);

    let currentRatePer10gPaise = 0;
    let currentValuePaise = 0;

    try {
      const liveRate = await this.ratesService.getCurrentRate('GOLD', DIGITAL_GOLD_PURITY);
      currentRatePer10gPaise = liveRate.ratePer10gPaise;
      // value = balanceMg * ratePerGram / 1000
      const ratePerGramPaise = Math.round(currentRatePer10gPaise / 10);
      currentValuePaise = Math.round((balanceMg * ratePerGramPaise) / 1000);
    } catch {
      // Rate not available; use zero
    }

    const profitLossPaise = currentValuePaise - totalInvestedPaise;
    const profitLossPercent =
      totalInvestedPaise > 0
        ? Math.round((profitLossPaise / totalInvestedPaise) * 10000) / 100
        : 0;

    return {
      id: vault.id,
      customerId: vault.customerId,
      balanceMg,
      balanceGrams: balanceMg / 1000,
      balanceTola: balanceMg / 11_664,
      totalInvestedPaise,
      totalSoldPaise: Number(vault.totalSoldPaise),
      avgBuyPricePer10gPaise: Number(vault.avgBuyPricePer10gPaise),
      currentValuePaise,
      currentRatePer10gPaise,
      profitLossPaise,
      profitLossPercent,
      kycVerified: vault.kycVerified,
      isActive: vault.isActive,
    };
  }

  /** Build monthly performance chart data for the last 12 months */
  private async buildPerformanceChart(
    tenantId: string,
    vaultId: string,
  ): Promise<GoldPortfolioResponse['performanceChart']> {
    const chart: GoldPortfolioResponse['performanceChart'] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthLabel = monthStart.toISOString().slice(0, 7); // YYYY-MM

      const agg = await this.prisma.goldTransaction.aggregate({
        where: {
          tenantId,
          vaultId,
          transactionType: { in: ['BUY', 'SIP_BUY'] },
          status: 'COMPLETED',
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountPaise: true, goldWeightMg: true },
      });

      chart.push({
        month: monthLabel,
        investedPaise: Number(agg._sum.amountPaise ?? 0n),
        valuePaise: 0, // Will be calculated with current rate on frontend
        goldWeightMg: Number(agg._sum.goldWeightMg ?? 0n),
      });
    }

    return chart;
  }

  private toTransactionResponse(record: {
    id: string;
    vaultId: string;
    transactionType: string;
    amountPaise: bigint;
    goldWeightMg: bigint;
    pricePerGramPaise: bigint;
    pricePer10gPaise: bigint;
    status: string;
    paymentMethod: string | null;
    reference: string | null;
    processedAt: Date | null;
    createdAt: Date;
  }): GoldTransactionResponse {
    return {
      id: record.id,
      vaultId: record.vaultId,
      transactionType: record.transactionType as GoldTransactionType,
      amountPaise: Number(record.amountPaise),
      goldWeightMg: Number(record.goldWeightMg),
      pricePerGramPaise: Number(record.pricePerGramPaise),
      pricePer10gPaise: Number(record.pricePer10gPaise),
      status: record.status as GoldTransactionStatus,
      paymentMethod: record.paymentMethod,
      reference: record.reference,
      processedAt: record.processedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
