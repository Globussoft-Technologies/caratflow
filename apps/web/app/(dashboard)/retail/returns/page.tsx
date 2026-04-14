'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { RotateCcw } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise, formatDate } from '@/components/format';

export default function ReturnsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, isLoading } = trpc.retail.listReturns.useQuery({
    filters: { status: status || undefined },
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const items = ((data?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sale Returns"
        description="Manage returned items and refunds."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Retail', href: '/retail' },
          { label: 'Returns' },
        ]}
      />

      <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 rounded-md border px-2 text-sm">
        <option value="">All</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="COMPLETED">Completed</option>
        <option value="REJECTED">Rejected</option>
      </select>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Return #</span>
          <span>Original Sale</span>
          <span>Refund</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<RotateCcw className="h-8 w-8" />} title="No returns" />
        ) : (
          <div className="divide-y">
            {items.map((r) => (
              <Link key={r.id as string} href={`/retail/returns/${r.id}`} className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-mono font-medium">{(r.returnNumber as string) ?? '-'}</span>
                <span className="font-mono text-xs text-muted-foreground">{(((r.originalSale as { invoiceNumber?: string })?.invoiceNumber) as string) ?? '-'}</span>
                <span className="font-semibold">{formatPaise(r.refundAmountPaise)}</span>
                <StatusBadge label={(r.status as string) ?? '-'} variant={getStatusVariant(r.status as string)} dot={false} />
                <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {data && <PaginationControls page={data.page} totalPages={data.totalPages} hasPrevious={data.hasPrevious} hasNext={data.hasNext} onChange={setPage} />}
    </div>
  );
}
