'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { FileText, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

export default function BomPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.manufacturing.bom.list.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const items = ((data?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bill of Materials"
        description="Manage BOMs for manufacturing products."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'BOM' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New BOM
          </button>
        }
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_0.8fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Name</span>
          <span>Version</span>
          <span>Status</span>
          <span>Product</span>
          <span>Updated</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8" />} title="No BOMs" />
        ) : (
          <div className="divide-y">
            {items.map((b) => (
              <Link key={b.id as string} href={`/manufacturing/bom/${b.id}`} className="grid grid-cols-[2fr_0.8fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-medium">{(b.name as string) ?? '-'}</span>
                <span>v{String(b.version ?? 1)}</span>
                <StatusBadge label={(b.status as string) ?? '-'} variant={getStatusVariant(b.status as string)} dot={false} />
                <span className="text-muted-foreground">{((b.product as { name?: string })?.name) ?? '-'}</span>
                <span className="text-muted-foreground">{formatDate(b.updatedAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {data && <PaginationControls page={data.page} totalPages={data.totalPages} hasPrevious={data.hasPrevious} hasNext={data.hasNext} onChange={setPage} />}
    </div>
  );
}
