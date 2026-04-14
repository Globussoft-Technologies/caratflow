'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Plus, LayoutList } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

export default function ProductionPlanningPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.manufacturing.plan.list.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const items = ((data?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Plans"
        description="Plan production for upcoming demand."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'Planning' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Plan
          </button>
        }
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Location</span>
          <span>Status</span>
          <span>Start</span>
          <span>End</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<LayoutList className="h-8 w-8" />} title="No plans" />
        ) : (
          <div className="divide-y">
            {items.map((p) => (
              <div key={p.id as string} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{(p.name as string) ?? '-'}</span>
                <span>{((p.location as { name?: string })?.name) ?? '-'}</span>
                <StatusBadge label={(p.status as string) ?? '-'} variant={getStatusVariant(p.status as string)} dot={false} />
                <span className="text-muted-foreground">{formatDate(p.startDate)}</span>
                <span className="text-muted-foreground">{formatDate(p.endDate)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {data && <PaginationControls page={data.page} totalPages={data.totalPages} hasPrevious={data.hasPrevious} hasNext={data.hasNext} onChange={setPage} />}
    </div>
  );
}
