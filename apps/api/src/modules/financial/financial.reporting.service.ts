// ─── Financial Reporting Service ───────────────────────────────
// P&L, Balance Sheet, Trial Balance, Cash Flow, Aging, Day Book.

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  ProfitAndLossReport,
  BalanceSheetReport,
  TrialBalanceReport,
  CashFlowReport,
  AgingReport,
  FinancialDashboardResponse,
} from '@caratflow/shared-types';

@Injectable()
export class FinancialReportingService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Profit & Loss ───────────────────────────────────────────

  async profitAndLoss(
    tenantId: string,
    dateRange: { from: Date; to: Date },
    costCenterId?: string,
  ): Promise<ProfitAndLossReport> {
    const revenueAccounts = await this.prisma.account.findMany({
      where: { tenantId, accountType: 'REVENUE', isActive: true },
    });
    const expenseAccounts = await this.prisma.account.findMany({
      where: { tenantId, accountType: 'EXPENSE', isActive: true },
    });

    const getBalance = async (accountId: string) => {
      const lines = await this.prisma.journalEntryLine.findMany({
        where: {
          tenantId,
          accountId,
          journalEntry: {
            status: 'POSTED',
            date: { gte: dateRange.from, lte: dateRange.to },
          },
        },
      });
      return lines.reduce(
        (sum, l) => sum + Number(l.creditPaise) - Number(l.debitPaise),
        0,
      );
    };

    const revenue = await Promise.all(
      revenueAccounts.map(async (acc) => ({
        accountId: acc.id,
        accountName: acc.name,
        amount: await getBalance(acc.id),
      })),
    );

    const expenses = await Promise.all(
      expenseAccounts.map(async (acc) => ({
        accountId: acc.id,
        accountName: acc.name,
        amount: Math.abs(await getBalance(acc.id)),
      })),
    );

    // Filter out zero-balance accounts
    const nonZeroRevenue = revenue.filter((r) => r.amount !== 0);
    const nonZeroExpenses = expenses.filter((e) => e.amount !== 0);

    const totalRevenue = nonZeroRevenue.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = nonZeroExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      fromDate: dateRange.from.toISOString(),
      toDate: dateRange.to.toISOString(),
      revenue: nonZeroRevenue,
      expenses: nonZeroExpenses,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
    };
  }

  // ─── Balance Sheet ────────────────────────────────────────────

  async balanceSheet(tenantId: string, asOfDate: Date): Promise<BalanceSheetReport> {
    const accounts = await this.prisma.account.findMany({
      where: { tenantId, isActive: true },
    });

    const getBalance = async (accountId: string, type: string) => {
      const lines = await this.prisma.journalEntryLine.findMany({
        where: {
          tenantId,
          accountId,
          journalEntry: { status: 'POSTED', date: { lte: asOfDate } },
        },
      });
      const netDebit = lines.reduce(
        (sum, l) => sum + Number(l.debitPaise) - Number(l.creditPaise),
        0,
      );
      // Assets are debit-normal, liabilities/equity are credit-normal
      return type === 'ASSET' ? netDebit : -netDebit;
    };

    const assets = await Promise.all(
      accounts
        .filter((a) => a.accountType === 'ASSET')
        .map(async (acc) => ({
          accountId: acc.id,
          accountName: acc.name,
          amount: await getBalance(acc.id, 'ASSET'),
        })),
    );

    const liabilities = await Promise.all(
      accounts
        .filter((a) => a.accountType === 'LIABILITY')
        .map(async (acc) => ({
          accountId: acc.id,
          accountName: acc.name,
          amount: await getBalance(acc.id, 'LIABILITY'),
        })),
    );

    const equity = await Promise.all(
      accounts
        .filter((a) => a.accountType === 'EQUITY')
        .map(async (acc) => ({
          accountId: acc.id,
          accountName: acc.name,
          amount: await getBalance(acc.id, 'EQUITY'),
        })),
    );

    const nonZeroAssets = assets.filter((a) => a.amount !== 0);
    const nonZeroLiabilities = liabilities.filter((l) => l.amount !== 0);
    const nonZeroEquity = equity.filter((e) => e.amount !== 0);

    return {
      asOfDate: asOfDate.toISOString(),
      assets: nonZeroAssets,
      liabilities: nonZeroLiabilities,
      equity: nonZeroEquity,
      totalAssets: nonZeroAssets.reduce((sum, a) => sum + a.amount, 0),
      totalLiabilities: nonZeroLiabilities.reduce((sum, l) => sum + l.amount, 0),
      totalEquity: nonZeroEquity.reduce((sum, e) => sum + e.amount, 0),
    };
  }

  // ─── Trial Balance ────────────────────────────────────────────

  async trialBalance(
    tenantId: string,
    dateRange: { from: Date; to: Date },
  ): Promise<TrialBalanceReport> {
    const accounts = await this.prisma.account.findMany({
      where: { tenantId, isActive: true },
      orderBy: { accountCode: 'asc' },
    });

    const results = await Promise.all(
      accounts.map(async (account) => {
        const lines = await this.prisma.journalEntryLine.findMany({
          where: {
            tenantId,
            accountId: account.id,
            journalEntry: {
              status: 'POSTED',
              date: { gte: dateRange.from, lte: dateRange.to },
            },
          },
        });

        const debitTotal = lines.reduce((sum, l) => sum + Number(l.debitPaise), 0);
        const creditTotal = lines.reduce((sum, l) => sum + Number(l.creditPaise), 0);

        return {
          accountId: account.id,
          accountCode: account.accountCode,
          accountName: account.name,
          accountType: account.accountType,
          debitTotal,
          creditTotal,
          balance: debitTotal - creditTotal,
        };
      }),
    );

    const nonZero = results.filter((r) => r.debitTotal > 0 || r.creditTotal > 0);

    return {
      asOfDate: dateRange.to.toISOString(),
      accounts: nonZero,
      totalDebits: nonZero.reduce((sum, a) => sum + a.debitTotal, 0),
      totalCredits: nonZero.reduce((sum, a) => sum + a.creditTotal, 0),
    };
  }

  // ─── Cash Flow ────────────────────────────────────────────────

  async cashFlow(
    tenantId: string,
    dateRange: { from: Date; to: Date },
  ): Promise<CashFlowReport> {
    // Simplified cash flow: sum of cash/bank account movements
    const cashAccounts = await this.prisma.account.findMany({
      where: {
        tenantId,
        accountType: 'ASSET',
        OR: [
          { name: { contains: 'Cash' } },
          { name: { contains: 'Bank' } },
          { accountCode: { startsWith: '100' } },
        ],
      },
    });

    const cashAccountIds = cashAccounts.map((a) => a.id);

    // Opening cash balance
    const openingLines = await this.prisma.journalEntryLine.findMany({
      where: {
        tenantId,
        accountId: { in: cashAccountIds },
        journalEntry: { status: 'POSTED', date: { lt: dateRange.from } },
      },
    });
    const openingCash = openingLines.reduce(
      (sum, l) => sum + Number(l.debitPaise) - Number(l.creditPaise),
      0,
    );

    // Period movements
    const periodLines = await this.prisma.journalEntryLine.findMany({
      where: {
        tenantId,
        accountId: { in: cashAccountIds },
        journalEntry: {
          status: 'POSTED',
          date: { gte: dateRange.from, lte: dateRange.to },
        },
      },
    });
    const netCashFlow = periodLines.reduce(
      (sum, l) => sum + Number(l.debitPaise) - Number(l.creditPaise),
      0,
    );

    return {
      fromDate: dateRange.from.toISOString(),
      toDate: dateRange.to.toISOString(),
      operatingActivities: netCashFlow, // Simplified
      investingActivities: 0,
      financingActivities: 0,
      netCashFlow,
      openingCash,
      closingCash: openingCash + netCashFlow,
    };
  }

  // ─── Aging Report ─────────────────────────────────────────────

  async agingReport(tenantId: string, type: 'AR' | 'AP'): Promise<AgingReport> {
    const now = new Date();
    const invoiceType = type === 'AR' ? 'SALES' : 'PURCHASE';

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceType,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      include: { customer: true, supplier: true },
    });

    const bucketDefs = [
      { label: '0-30 days', min: 0, max: 30 },
      { label: '31-60 days', min: 31, max: 60 },
      { label: '61-90 days', min: 61, max: 90 },
      { label: '91-120 days', min: 91, max: 120 },
      { label: '120+ days', min: 121, max: Infinity },
    ];

    const buckets = bucketDefs.map((b) => ({
      label: b.label,
      amountPaise: 0,
      count: 0,
    }));

    const entries = invoices.map((inv) => {
      const outstandingPaise = Number(inv.totalPaise) - Number(inv.paidPaise);
      const invoiceDate = inv.createdAt;
      const dueDate = inv.dueDate ?? inv.createdAt;
      const ageDays = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Add to appropriate bucket
      for (let i = 0; i < bucketDefs.length; i++) {
        const def = bucketDefs[i]!;
        if (ageDays >= def.min && ageDays <= def.max) {
          buckets[i]!.amountPaise += outstandingPaise;
          buckets[i]!.count += 1;
          break;
        }
      }

      const partyName = type === 'AR'
        ? `${inv.customer?.firstName ?? ''} ${inv.customer?.lastName ?? ''}`.trim()
        : inv.supplier?.name ?? '';

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        partyName,
        invoiceDate: invoiceDate.toISOString().split('T')[0]!,
        dueDate: dueDate.toISOString().split('T')[0]!,
        totalPaise: Number(inv.totalPaise),
        paidPaise: Number(inv.paidPaise),
        outstandingPaise,
        ageDays: Math.max(0, ageDays),
      };
    });

    return {
      type,
      asOfDate: now.toISOString().split('T')[0]!,
      buckets,
      totalOutstanding: entries.reduce((sum, e) => sum + e.outstandingPaise, 0),
      entries,
    };
  }

  // ─── Day Book ─────────────────────────────────────────────────

  async dayBook(tenantId: string, date: Date) {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    const entries = await this.prisma.journalEntry.findMany({
      where: {
        tenantId,
        date: { gte: startOfDay, lte: endOfDay },
        status: 'POSTED',
      },
      include: { lines: { include: { account: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return entries;
  }

  // ─── Financial Dashboard ──────────────────────────────────────

  async getDashboard(tenantId: string): Promise<FinancialDashboardResponse> {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Current month P&L
    const currentPnl = await this.profitAndLoss(tenantId, { from: thisMonthStart, to: now });
    const lastPnl = await this.profitAndLoss(tenantId, { from: lastMonthStart, to: lastMonthEnd });

    const revenueTrend = lastPnl.totalRevenue > 0
      ? ((currentPnl.totalRevenue - lastPnl.totalRevenue) / lastPnl.totalRevenue) * 100
      : 0;
    const expenseTrend = lastPnl.totalExpenses > 0
      ? ((currentPnl.totalExpenses - lastPnl.totalExpenses) / lastPnl.totalExpenses) * 100
      : 0;

    // Cash position
    const cashFlow = await this.cashFlow(tenantId, { from: new Date(2000, 0, 1), to: now });

    // AR/AP aging
    const arAging = await this.agingReport(tenantId, 'AR');
    const apAging = await this.agingReport(tenantId, 'AP');

    // Recent transactions
    const recentJournalEntries = await this.prisma.journalEntry.findMany({
      where: { tenantId, status: 'POSTED' },
      orderBy: { date: 'desc' },
      take: 10,
      include: { lines: true },
    });

    const recentTransactions = recentJournalEntries.map((entry) => {
      const totalDebit = entry.lines.reduce((sum, l) => sum + Number(l.debitPaise), 0);
      return {
        id: entry.id,
        date: entry.date.toISOString(),
        description: entry.description,
        amountPaise: totalDebit,
        type: 'debit' as const,
      };
    });

    // Monthly P&L for last 6 months
    const monthlyPnl: Array<{ month: string; revenue: number; expenses: number; profit: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const pnl = await this.profitAndLoss(tenantId, { from: monthStart, to: monthEnd });
      const monthLabel = monthStart.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      monthlyPnl.push({
        month: monthLabel,
        revenue: pnl.totalRevenue,
        expenses: pnl.totalExpenses,
        profit: pnl.netProfit,
      });
    }

    return {
      totalRevenue: currentPnl.totalRevenue,
      totalExpenses: currentPnl.totalExpenses,
      netProfit: currentPnl.netProfit,
      cashPosition: cashFlow.closingCash,
      accountsReceivable: arAging.totalOutstanding,
      accountsPayable: apAging.totalOutstanding,
      revenueTrend,
      expenseTrend,
      recentTransactions,
      monthlyPnl,
      arAgingSummary: arAging.buckets,
      apAgingSummary: apAging.buckets,
    };
  }
}
