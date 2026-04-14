'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Target, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, isLoading } = trpc.crm.leadList.useQuery({
    page,
    limit: 20,
    status: status || undefined,
  });
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Sales pipeline and lead management."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Leads' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Lead
          </button>
        }
      />

      <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-9 rounded-md border px-2 text-sm">
        <option value="">All statuses</option>
        <option value="NEW">New</option>
        <option value="CONTACTED">Contacted</option>
        <option value="QUALIFIED">Qualified</option>
        <option value="PROPOSAL">Proposal</option>
        <option value="WON">Won</option>
        <option value="LOST">Lost</option>
      </select>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Phone</span>
          <span>Source</span>
          <span>Status</span>
          <span>Created</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Target className="h-8 w-8" />} title="No leads" />
        ) : (
          <div className="divide-y">
            {items.map((l) => (
              <Link key={l.id as string} href={`/crm/leads/${l.id}`} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-medium">{(l.name as string) ?? '-'}</span>
                <span>{(l.phone as string) ?? '-'}</span>
                <span>{(l.source as string) ?? '-'}</span>
                <StatusBadge label={(l.status as string) ?? '-'} variant={getStatusVariant(l.status as string)} dot={false} />
                <span className="text-muted-foreground">{formatDate(l.createdAt)}</span>
              </Link>
            ))}
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
