'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Plus, Hammer } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useRealtime } from '@/lib/realtime';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

export default function JobOrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const query = trpc.manufacturing.job.list.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
    filter: status ? ({ status: status as never } as never) : undefined,
  });
  const { data, isLoading } = query;

  // Live refetch on job status changes (created / completed broadcasts).
  const refetchJobs = useCallback(() => {
    void query.refetch();
  }, [query]);
  useRealtime('manufacturing.job.completed', refetchJobs);
  useRealtime('manufacturing.job.created', refetchJobs);
  const items = ((data?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Orders"
        description="Track manufacturing job orders from planning to completion."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'Job Orders' },
        ]}
        actions={
          <Link href="/manufacturing/jobs/new" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Job
          </Link>
        }
      />

      <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 rounded-md border px-2 text-sm">
        <option value="">All statuses</option>
        <option value="PLANNED">Planned</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="QC_PENDING">QC Pending</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Job #</span>
          <span>Product</span>
          <span>Qty</span>
          <span>Karigar</span>
          <span>Status</span>
          <span>Due</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Hammer className="h-8 w-8" />} title="No jobs" />
        ) : (
          <div className="divide-y">
            {items.map((j) => (
              <Link key={j.id as string} href={`/manufacturing/jobs/${j.id}`} className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-mono font-medium">{(j.jobNumber as string) ?? '-'}</span>
                <span>{((j.product as { name?: string })?.name) ?? '-'}</span>
                <span>{String(j.quantity ?? 0)}</span>
                <span>{((j.karigar as { firstName?: string })?.firstName) ?? '-'}</span>
                <StatusBadge label={(j.status as string) ?? '-'} variant={getStatusVariant(j.status as string)} dot={false} />
                <span className="text-muted-foreground">{formatDate(j.dueDate)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {data && <PaginationControls page={data.page} totalPages={data.totalPages} hasPrevious={data.hasPrevious} hasNext={data.hasNext} onChange={setPage} />}
    </div>
  );
}
