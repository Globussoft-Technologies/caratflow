'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Video } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

const STATUS_OPTIONS = [
  '', 'REQUESTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
] as const;

export default function ConsultationsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = trpc.crm.videoConsultation.list.useQuery({
    page,
    limit: 20,
    status: (status || undefined) as
      | 'REQUESTED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | undefined,
  });

  const d = data as
    | { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean }
    | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Consultations"
        description="Scheduled video shopping consultations with customers."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Consultations' },
        ]}
      />

      <select
        value={status}
        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        className="h-9 rounded-md border px-2 text-sm"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s || 'all'} value={s}>{s || 'All statuses'}</option>
        ))}
      </select>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Customer</span>
          <span>Status</span>
          <span>Requested</span>
          <span>Scheduled</span>
          <span>Language</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Video className="h-8 w-8" />} title="No consultations" />
        ) : (
          <div className="divide-y">
            {items.map((c) => {
              const cust = c.customer as { firstName?: string; lastName?: string } | undefined;
              const name = cust ? `${cust.firstName ?? ''} ${cust.lastName ?? ''}`.trim() : '-';
              return (
                <Link
                  key={c.id as string}
                  href={`/crm/consultations/${c.id}`}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent"
                >
                  <span className="font-medium">{name || '-'}</span>
                  <StatusBadge
                    label={(c.status as string) ?? '-'}
                    variant={getStatusVariant(c.status as string)}
                    dot={false}
                  />
                  <span className="text-muted-foreground">{formatDate(c.requestedAt)}</span>
                  <span className="text-muted-foreground">{formatDate(c.scheduledAt)}</span>
                  <span className="text-muted-foreground">{(c.preferredLang as string) ?? 'en'}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {d && d.totalPages && d.totalPages > 0 && (
        <PaginationControls
          page={d.page ?? 1}
          totalPages={d.totalPages}
          hasPrevious={d.hasPrevious ?? false}
          hasNext={d.hasNext ?? false}
          onChange={setPage}
        />
      )}
    </div>
  );
}
