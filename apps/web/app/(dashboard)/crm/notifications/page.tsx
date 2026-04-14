'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Bell } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDateTime } from '@/components/format';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, isLoading } = trpc.crm.notificationLogs.useQuery({
    page,
    limit: 20,
    status: status || undefined,
  });
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Logs"
        description="Track sent notifications across channels."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Notifications' },
        ]}
      />

      <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 rounded-md border px-2 text-sm">
        <option value="">All</option>
        <option value="PENDING">Pending</option>
        <option value="SENT">Sent</option>
        <option value="FAILED">Failed</option>
      </select>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_1.2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Channel</span>
          <span>To</span>
          <span>Template</span>
          <span>Status</span>
          <span>Sent</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Bell className="h-8 w-8" />} title="No notifications" />
        ) : (
          <div className="divide-y">
            {items.map((n) => (
              <div key={n.id as string} className="grid grid-cols-[1fr_1.2fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span>{(n.channel as string) ?? '-'}</span>
                <span className="truncate">{(n.recipient as string) ?? '-'}</span>
                <span className="text-muted-foreground truncate">{(n.templateName as string) ?? '-'}</span>
                <StatusBadge label={(n.status as string) ?? '-'} variant="default" />
                <span className="text-muted-foreground">{formatDateTime(n.sentAt ?? n.createdAt)}</span>
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
