'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Gift, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';

export default function GoldSavingsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.india.schemes.goldSavings.list.useQuery({ page, limit: 20 } as never);
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Gold Savings Schemes" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance', href: '/finance' },
        { label: 'Schemes', href: '/finance/schemes' },
        { label: 'Gold Savings' },
      ]} actions={
        <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Scheme
        </button>
      } />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Duration</span>
          <span>Members</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Gift className="h-8 w-8" />} title="No gold savings schemes" />
        ) : (
          <div className="divide-y">
            {items.map((s) => (
              <Link key={s.id as string} href={`/finance/schemes/gold-savings/${s.id}`} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-medium">{(s.name as string) ?? '-'}</span>
                <span>{String(s.durationMonths ?? '-')} months</span>
                <span>{String((s.members as unknown[] | undefined)?.length ?? 0)}</span>
                <StatusBadge label={(s.status as string) ?? '-'} variant="default" />
              </Link>
            ))}
          </div>
        )}
      </div>
      {d && d.totalPages && d.totalPages > 0 && (
        <PaginationControls page={d.page ?? 1} totalPages={d.totalPages} hasPrevious={d.hasPrevious ?? false} hasNext={d.hasNext ?? false} onChange={setPage} />
      )}
    </div>
  );
}
