'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { MessageSquare } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

export default function FeedbackPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, isLoading } = trpc.crm.feedbackList.useQuery({
    page,
    limit: 20,
    status: status || undefined,
  });
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback"
        description="Customer feedback and reviews."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Feedback' },
        ]}
      />

      <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 rounded-md border px-2 text-sm">
        <option value="">All</option>
        <option value="NEW">New</option>
        <option value="REVIEWED">Reviewed</option>
        <option value="ACTIONED">Actioned</option>
      </select>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_0.6fr_2fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Type</span>
          <span>Rating</span>
          <span>Comments</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<MessageSquare className="h-8 w-8" />} title="No feedback" />
        ) : (
          <div className="divide-y">
            {items.map((f) => (
              <div key={f.id as string} className="grid grid-cols-[1fr_0.6fr_2fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span>{(f.feedbackType as string) ?? '-'}</span>
                <span>{'★'.repeat(Number(f.rating ?? 0))}</span>
                <span className="truncate text-muted-foreground">{(f.comments as string) ?? ''}</span>
                <StatusBadge label={(f.status as string) ?? '-'} variant="default" />
                <span className="text-muted-foreground">{formatDate(f.createdAt)}</span>
              </div>
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
