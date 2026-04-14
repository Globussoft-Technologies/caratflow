'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise, formatDate } from '@/components/format';

export default function DgftLicensesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.export.listLicenses.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="DGFT Licenses" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Export', href: '/export' },
        { label: 'Licenses' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>License #</span>
          <span>Type</span>
          <span>Value</span>
          <span>Utilized</span>
          <span>Status</span>
          <span>Expiry</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8" />} title="No licenses" />
        ) : (
          <div className="divide-y">
            {items.map((l) => (
              <div key={l.id as string} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-mono font-medium">{(l.licenseNumber as string) ?? '-'}</span>
                <span>{(l.licenseType as string) ?? '-'}</span>
                <span>{formatPaise(l.valuePaise)}</span>
                <span>{formatPaise(l.utilizedPaise)}</span>
                <StatusBadge label={(l.status as string) ?? '-'} variant="default" />
                <span className="text-muted-foreground">{formatDate(l.expiryDate)}</span>
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
