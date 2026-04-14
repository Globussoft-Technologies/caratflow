'use client';

import Link from 'next/link';
import { PageHeader, StatCard } from '@caratflow/ui';
import { FileText, IndianRupee, Book, ArrowRight, Receipt, Landmark } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function FinanceDashboardPage() {
  const { data } = trpc.financial.dashboard.useQuery();
  const d = (data as Record<string, unknown> | undefined) ?? {};

  const links = [
    { label: 'Journal Entries', href: '/finance/journal', icon: Book },
    { label: 'Invoices', href: '/finance/invoices', icon: FileText },
    { label: 'Payments', href: '/finance/payments', icon: IndianRupee },
    { label: 'Reports', href: '/finance/reports', icon: Receipt },
    { label: 'Tax', href: '/finance/tax', icon: Receipt },
    { label: 'Bank', href: '/finance/bank', icon: Landmark },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Finance" description="Accounting, invoices, payments, tax and reports." breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Finance' }]} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Receivables" value={formatPaise(d.totalReceivablesPaise)} icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard title="Payables" value={formatPaise(d.totalPayablesPaise)} icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard title="Cash Balance" value={formatPaise(d.cashBalancePaise)} icon={<Landmark className="h-4 w-4" />} />
        <StatCard title="MTD Revenue" value={formatPaise(d.mtdRevenuePaise)} icon={<Receipt className="h-4 w-4" />} />
      </div>

      <div className="space-y-2">
        {links.map((l) => (
          <Link key={l.label} href={l.href} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent">
            <div className="flex items-center gap-3">
              <l.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{l.label}</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
