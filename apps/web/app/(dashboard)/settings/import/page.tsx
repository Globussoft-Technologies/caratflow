'use client';

import { useState } from 'react';
import { PageHeader, EmptyState } from '@caratflow/ui';
import { Upload } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatDateTime } from '@/components/format';

export default function ImportPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.platform.import.listJobs.useQuery({ page, limit: 20 } as never);
  const d = data as { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> | undefined;
  const items = Array.isArray(d) ? d : (d?.items ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Data Import" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Settings', href: '/settings' },
        { label: 'Import' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Job ID</span>
          <span>Entity</span>
          <span>Status</span>
          <span>Rows</span>
          <span>Created</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Upload className="h-8 w-8" />} title="No import jobs" />
        ) : (
          <div className="divide-y">
            {items.map((j) => (
              <div key={j.id as string} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-mono text-xs">{(j.id as string).slice(0, 8)}</span>
                <span>{(j.entityType as string) ?? '-'}</span>
                <span>{(j.status as string) ?? '-'}</span>
                <span>{String(j.processedRows ?? 0)} / {String(j.totalRows ?? 0)}</span>
                <span className="text-muted-foreground">{formatDateTime(j.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
