'use client';

import * as React from 'react';
import { PageHeader, StatCard } from '@caratflow/ui';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  CreditCard,
  Calculator,
  Landmark,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

// Mock dashboard data -- will be replaced by tRPC call
const mockDashboard = {
  totalRevenue: 2_450_000_00, // paise
  totalExpenses: 1_820_000_00,
  netProfit: 630_000_00,
  cashPosition: 1_245_000_00,
  accountsReceivable: 580_000_00,
  accountsPayable: 320_000_00,
  revenueTrend: 12.5,
  expenseTrend: 8.3,
  recentTransactions: [
    { id: '1', date: '2026-04-03', description: 'Gold necklace sale - Priya Sharma', amountPaise: 185000_00, type: 'credit' as const },
    { id: '2', date: '2026-04-03', description: 'Purchase from Rajesh Gold Suppliers', amountPaise: 450000_00, type: 'debit' as const },
    { id: '3', date: '2026-04-02', description: 'Diamond ring sale - Amit Patel', amountPaise: 95000_00, type: 'credit' as const },
    { id: '4', date: '2026-04-02', description: 'Making charges - Karigar payment', amountPaise: 25000_00, type: 'debit' as const },
    { id: '5', date: '2026-04-01', description: 'Silver set sale - Walk-in customer', amountPaise: 12500_00, type: 'credit' as const },
  ],
  monthlyPnl: [
    { month: 'Nov 25', revenue: 1_980_000_00, expenses: 1_540_000_00, profit: 440_000_00 },
    { month: 'Dec 25', revenue: 2_680_000_00, expenses: 1_950_000_00, profit: 730_000_00 },
    { month: 'Jan 26', revenue: 2_100_000_00, expenses: 1_680_000_00, profit: 420_000_00 },
    { month: 'Feb 26', revenue: 2_300_000_00, expenses: 1_720_000_00, profit: 580_000_00 },
    { month: 'Mar 26', revenue: 2_550_000_00, expenses: 1_890_000_00, profit: 660_000_00 },
    { month: 'Apr 26', revenue: 2_450_000_00, expenses: 1_820_000_00, profit: 630_000_00 },
  ],
};

function formatRupees(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 10_000_000) return `${(rupees / 10_000_000).toFixed(2)} Cr`;
  if (rupees >= 100_000) return `${(rupees / 100_000).toFixed(2)} L`;
  if (rupees >= 1_000) return `${(rupees / 1_000).toFixed(1)}K`;
  return rupees.toLocaleString('en-IN');
}

function formatFullRupees(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

const quickLinks = [
  { href: '/finance/invoices', icon: FileText, label: 'Invoices', color: 'text-blue-600' },
  { href: '/finance/payments', icon: CreditCard, label: 'Payments', color: 'text-emerald-600' },
  { href: '/finance/journal', icon: Calculator, label: 'Journal', color: 'text-purple-600' },
  { href: '/finance/tax', icon: IndianRupee, label: 'GST/Tax', color: 'text-orange-600' },
  { href: '/finance/bank', icon: Landmark, label: 'Banking', color: 'text-cyan-600' },
  { href: '/finance/reports', icon: BarChart3, label: 'Reports', color: 'text-pink-600' },
];

export default function FinanceDashboardPage() {
  const d = mockDashboard;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Financial overview, invoicing, payments, and accounting."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Finance' }]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Revenue (MTD)"
          value={`${formatRupees(d.totalRevenue)}`}
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          trend={{ value: d.revenueTrend, label: 'vs last month' }}
        />
        <StatCard
          title="Expenses (MTD)"
          value={`${formatRupees(d.totalExpenses)}`}
          icon={<TrendingDown className="h-5 w-5 text-red-500" />}
          trend={{ value: d.expenseTrend, label: 'vs last month' }}
        />
        <StatCard
          title="Net Profit"
          value={`${formatRupees(d.netProfit)}`}
          icon={<Wallet className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Cash Position"
          value={`${formatRupees(d.cashPosition)}`}
          icon={<IndianRupee className="h-5 w-5 text-green-600" />}
        />
        <StatCard
          title="Receivables"
          value={`${formatRupees(d.accountsReceivable)}`}
          icon={<ArrowDownRight className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          title="Payables"
          value={`${formatRupees(d.accountsPayable)}`}
          icon={<ArrowUpRight className="h-5 w-5 text-red-600" />}
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
          >
            <link.icon className={`h-6 w-6 ${link.color}`} />
            <span className="text-sm font-medium">{link.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly P&L Chart (simplified bar representation) */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Monthly P&L (Last 6 Months)</h3>
          <div className="space-y-3">
            {d.monthlyPnl.map((m) => {
              const maxVal = Math.max(...d.monthlyPnl.map((x) => x.revenue));
              const revenueWidth = (m.revenue / maxVal) * 100;
              const expenseWidth = (m.expenses / maxVal) * 100;
              return (
                <div key={m.month} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground w-14">{m.month}</span>
                    <span className="text-emerald-600">{formatRupees(m.profit)}</span>
                  </div>
                  <div className="flex gap-1">
                    <div
                      className="h-2 rounded bg-emerald-500"
                      style={{ width: `${revenueWidth}%` }}
                      title={`Revenue: ${formatRupees(m.revenue)}`}
                    />
                  </div>
                  <div className="flex gap-1">
                    <div
                      className="h-2 rounded bg-red-400"
                      style={{ width: `${expenseWidth}%` }}
                      title={`Expenses: ${formatRupees(m.expenses)}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-emerald-500" /> Revenue
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded bg-red-400" /> Expenses
            </span>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Recent Transactions</h3>
          <div className="space-y-3">
            {d.recentTransactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{txn.description}</p>
                  <p className="text-xs text-muted-foreground">{txn.date}</p>
                </div>
                <span
                  className={`ml-4 text-sm font-medium whitespace-nowrap ${
                    txn.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {txn.type === 'credit' ? '+' : '-'}{formatFullRupees(txn.amountPaise)}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/finance/journal"
            className="mt-4 block text-center text-sm text-primary hover:underline"
          >
            View all transactions
          </Link>
        </div>
      </div>
    </div>
  );
}
