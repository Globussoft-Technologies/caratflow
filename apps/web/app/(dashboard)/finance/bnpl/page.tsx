'use client';

import * as React from 'react';
import { PageHeader, StatusBadge } from '@caratflow/ui';
import {
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  IndianRupee,
} from 'lucide-react';
import Link from 'next/link';

interface StatCard {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: string;
  href?: string;
}

// Mock data -- will be replaced with tRPC calls
const mockStats: StatCard[] = [
  {
    title: 'Active BNPL',
    value: '24',
    description: 'Currently active transactions',
    icon: <CreditCard className="h-5 w-5 text-blue-600" />,
    href: '/finance/bnpl/transactions',
  },
  {
    title: 'Total Outstanding',
    value: '12,45,000',
    description: 'Outstanding EMI amount',
    icon: <IndianRupee className="h-5 w-5 text-amber-600" />,
  },
  {
    title: 'EMI Collected',
    value: '8,32,500',
    description: 'This month',
    icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
    trend: '+12%',
  },
  {
    title: 'Overdue',
    value: '3',
    description: 'Overdue installments',
    icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
    href: '/finance/bnpl/transactions',
  },
  {
    title: 'Completed',
    value: '156',
    description: 'Total completed transactions',
    icon: <CheckCircle className="h-5 w-5 text-emerald-600" />,
  },
  {
    title: 'Upcoming',
    value: '18',
    description: 'EMIs due this week',
    icon: <Clock className="h-5 w-5 text-blue-600" />,
  },
];

interface RecentTransaction {
  id: string;
  orderId: string;
  customerName: string;
  provider: string;
  amountPaise: number;
  emiPaise: number;
  tenure: number;
  status: string;
  nextDueDate: string;
}

const mockRecentTransactions: RecentTransaction[] = [
  {
    id: '1',
    orderId: 'ORD-202604-0042',
    customerName: 'Priya Sharma',
    provider: 'BAJAJ_FINSERV',
    amountPaise: 250000_00,
    emiPaise: 22500_00,
    tenure: 12,
    status: 'ACTIVE',
    nextDueDate: '2026-05-01',
  },
  {
    id: '2',
    orderId: 'ORD-202604-0039',
    customerName: 'Amit Patel',
    provider: 'HDFC_FLEXIPAY',
    amountPaise: 180000_00,
    emiPaise: 31200_00,
    tenure: 6,
    status: 'ACTIVE',
    nextDueDate: '2026-04-15',
  },
  {
    id: '3',
    orderId: 'ORD-202604-0035',
    customerName: 'Sunita Jain',
    provider: 'SIMPL',
    amountPaise: 75000_00,
    emiPaise: 25500_00,
    tenure: 3,
    status: 'APPROVED',
    nextDueDate: '2026-04-20',
  },
  {
    id: '4',
    orderId: 'ORD-202603-0128',
    customerName: 'Rajesh Kumar',
    provider: 'LAZYPAY',
    amountPaise: 50000_00,
    emiPaise: 17200_00,
    tenure: 3,
    status: 'DEFAULTED',
    nextDueDate: '2026-03-15',
  },
];

const providerLabels: Record<string, string> = {
  SIMPL: 'Simpl',
  LAZYPAY: 'LazyPay',
  ZESTMONEY: 'ZestMoney',
  BAJAJ_FINSERV: 'Bajaj Finserv',
  HDFC_FLEXIPAY: 'HDFC FlexiPay',
  CUSTOM: 'Custom',
};

function formatCurrency(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export default function BnplDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="BNPL & EMI"
        description="Buy Now Pay Later transactions, EMI collection stats, and provider performance."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'BNPL & EMI' },
        ]}
        actions={
          <div className="flex gap-2">
            <Link
              href="/finance/bnpl/providers"
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Providers
            </Link>
            <Link
              href="/finance/bnpl/plans"
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              EMI Plans
            </Link>
            <Link
              href="/finance/bnpl/transactions"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              All Transactions
            </Link>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockStats.map((stat) => {
          const content = (
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                {stat.icon}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold">{stat.title.includes('Outstanding') || stat.title.includes('Collected') ? `\u20B9${stat.value}` : stat.value}</span>
                {stat.trend && (
                  <span className="text-xs font-medium text-emerald-600">{stat.trend}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
            </div>
          );

          if (stat.href) {
            return (
              <Link key={stat.title} href={stat.href} className="block transition-shadow hover:shadow-md">
                {content}
              </Link>
            );
          }
          return <div key={stat.title}>{content}</div>;
        })}
      </div>

      {/* Recent Transactions */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <Link
            href="/finance/bnpl/transactions"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="px-6 py-3 font-medium">Order</th>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Provider</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium text-right">EMI</th>
                <th className="px-6 py-3 font-medium text-center">Tenure</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Next Due</th>
              </tr>
            </thead>
            <tbody>
              {mockRecentTransactions.map((tx) => (
                <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="px-6 py-3">
                    <span className="font-mono text-sm">{tx.orderId}</span>
                  </td>
                  <td className="px-6 py-3 text-sm">{tx.customerName}</td>
                  <td className="px-6 py-3 text-sm">{providerLabels[tx.provider] ?? tx.provider}</td>
                  <td className="px-6 py-3 text-right font-mono text-sm">
                    {formatCurrency(tx.amountPaise)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-sm">
                    {formatCurrency(tx.emiPaise)}
                  </td>
                  <td className="px-6 py-3 text-center text-sm">{tx.tenure}m</td>
                  <td className="px-6 py-3">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{tx.nextDueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
