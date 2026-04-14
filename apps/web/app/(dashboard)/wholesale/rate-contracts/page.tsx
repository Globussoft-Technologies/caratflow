'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Plus, FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

export default function RateContractsPage() {
  const [page, setPage] = useState(1);
  const [activeOnly, setActiveOnly] = useState(true);
  const { data, isLoading } = trpc.wholesale.listRateContracts.useQuery({
    filters: { isActive: activeOnly || undefined },
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const items = ((data?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rate Contracts"
        description="Supplier rate contracts for metals and making charges."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Rate Contracts' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            New Contract
          </button>
        }
      />

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={activeOnly} onChange={(e) => { setActiveOnly(e.target.checked); setPage(1); }} />
        Active only
      </label>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>Supplier</span>
          <span>Metal</span>
          <span>Valid From</span>
          <span>Valid To</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8" />} title="No rate contracts" />
        ) : (
          <div className="divide-y">
            {items.map((c) => {
              const supplier = c.supplier as { name?: string } | undefined;
              return (
                <div key={c.id as string} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr] gap-4 px-4 py-3 text-sm">
                  <span className="font-medium">{supplier?.name ?? '-'}</span>
                  <span>{(c.metalType as string) ?? '-'}</span>
                  <span className="text-muted-foreground">{formatDate(c.validFrom)}</span>
                  <span className="text-muted-foreground">{formatDate(c.validTo)}</span>
                  <StatusBadge
                    label={c.isActive ? 'Active' : 'Expired'}
                    variant={c.isActive ? 'success' : 'default'}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {data && (
        <PaginationControls page={data.page} totalPages={data.totalPages} hasPrevious={data.hasPrevious} hasNext={data.hasNext} onChange={setPage} />
      )}
    </div>
  );
}
