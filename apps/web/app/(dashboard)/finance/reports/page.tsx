'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';
import { BarChart3, FileText, Scale, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const reports = [
  {
    href: '/finance/reports/pnl',
    icon: TrendingUp,
    title: 'Profit & Loss',
    description: 'Revenue, expenses, and net profit for a given period.',
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950',
  },
  {
    href: '/finance/reports/balance-sheet',
    icon: Scale,
    title: 'Balance Sheet',
    description: 'Assets, liabilities, and equity as of a specific date.',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
  },
  {
    href: '/finance/reports/trial-balance',
    icon: BarChart3,
    title: 'Trial Balance',
    description: 'All account balances to verify double-entry integrity.',
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-950',
  },
  {
    href: '/finance/reports/aging',
    icon: Clock,
    title: 'Aging Report',
    description: 'Accounts receivable and payable aging analysis.',
    color: 'text-orange-600 bg-orange-50 dark:bg-orange-950',
  },
];

export default function ReportsHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description="Generate and view key financial statements and reports."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Reports' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="flex items-center justify-between rounded-lg border bg-card p-6 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-3 ${report.color}`}>
                <report.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">{report.title}</h3>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
