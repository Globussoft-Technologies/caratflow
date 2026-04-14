'use client';

import Link from 'next/link';
import { PageHeader } from '@caratflow/ui';
import { Receipt, FileText, BarChart, PieChart, Clock } from 'lucide-react';

export default function FinanceReportsPage() {
  const reports = [
    { label: 'Profit & Loss', href: '/finance/reports/pnl', icon: BarChart },
    { label: 'Balance Sheet', href: '/finance/reports/balance-sheet', icon: PieChart },
    { label: 'Trial Balance', href: '/finance/reports/trial-balance', icon: FileText },
    { label: 'Aging (AR/AP)', href: '/finance/reports/aging', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        description="P&L, Balance Sheet, Trial Balance, Aging."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Reports' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <Link key={r.label} href={r.href} className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent">
            <r.icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">{r.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
