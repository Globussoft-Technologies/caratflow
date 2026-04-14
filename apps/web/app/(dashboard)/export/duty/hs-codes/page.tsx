'use client';

import { useState } from 'react';
import { PageHeader, EmptyState } from '@caratflow/ui';
import { List } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function HsCodesPage() {
  const [query, setQuery] = useState('');
  const { data, isLoading } = trpc.export.searchHsCodes.useQuery({
    search: { search: query || undefined, isActive: true } as never,
    pagination: { page: 1, limit: 30, sortOrder: 'desc' },
  });
  const d = data as { items?: Array<Record<string, unknown>> } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="HS Codes" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Export', href: '/export' },
        { label: 'Duty', href: '/export/duty' },
        { label: 'HS Codes' },
      ]} />
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search HS code or description..." className="h-9 w-96 rounded-md border bg-transparent px-3 text-sm" />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1fr_3fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>HS Code</span>
          <span>Description</span>
          <span>Duty %</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<List className="h-8 w-8" />} title="No HS codes" />
        ) : (
          <div className="divide-y">
            {items.map((h) => (
              <div key={h.hsCode as string} className="grid grid-cols-[1fr_3fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-mono">{h.hsCode as string}</span>
                <span>{(h.description as string) ?? '-'}</span>
                <span>{String(h.baseDutyPercent ?? '-')}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
