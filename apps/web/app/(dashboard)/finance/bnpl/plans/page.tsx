'use client';

import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function BnplPlansPage() {
  const { data, isLoading } = trpc.bnpl.listEmiPlans.useQuery({} as never);
  const items = ((data as Array<Record<string, unknown>> | { items?: Array<Record<string, unknown>> } | undefined));
  const rows = Array.isArray(items) ? items : (items?.items ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="EMI Plans" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance', href: '/finance' },
        { label: 'BNPL', href: '/finance/bnpl' },
        { label: 'Plans' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Tenure</span>
          <span>Interest</span>
          <span>Min Amount</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8" />} title="No plans" />
        ) : (
          <div className="divide-y">
            {rows.map((p) => (
              <div key={p.id as string} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{(p.name as string) ?? '-'}</span>
                <span>{String(p.tenureMonths ?? '-')} months</span>
                <span>{String(p.interestRate ?? '-')}%</span>
                <span>{formatPaise(p.minAmountPaise)}</span>
                <StatusBadge label={p.isActive ? 'Active' : 'Inactive'} variant={p.isActive ? 'success' : 'default'} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
