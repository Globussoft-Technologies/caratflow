'use client';

import Link from 'next/link';
import { PageHeader, StatCard } from '@caratflow/ui';
import { CreditCard, Users, FileText, List } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function BnplDashboardPage() {
  const { data } = trpc.bnpl.getDashboard.useQuery();
  const d = (data as Record<string, unknown> | undefined) ?? {};

  return (
    <div className="space-y-6">
      <PageHeader title="Buy Now Pay Later" description="BNPL providers, EMI plans, and transactions." breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance', href: '/finance' },
        { label: 'BNPL' },
      ]} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Active Providers" value={String((d.activeProviders as number) ?? 0)} icon={<Users className="h-4 w-4" />} />
        <StatCard title="EMI Plans" value={String((d.activePlans as number) ?? 0)} icon={<FileText className="h-4 w-4" />} />
        <StatCard title="Transactions" value={String((d.totalTransactions as number) ?? 0)} icon={<CreditCard className="h-4 w-4" />} />
      </div>

      <div className="space-y-2">
        <Link href="/finance/bnpl/providers" className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent">
          <Users className="h-4 w-4" /><span className="text-sm font-medium">Providers</span>
        </Link>
        <Link href="/finance/bnpl/plans" className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent">
          <FileText className="h-4 w-4" /><span className="text-sm font-medium">EMI Plans</span>
        </Link>
        <Link href="/finance/bnpl/transactions" className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent">
          <List className="h-4 w-4" /><span className="text-sm font-medium">Transactions</span>
        </Link>
      </div>
    </div>
  );
}
