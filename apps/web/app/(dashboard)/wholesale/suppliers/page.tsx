'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Plus, Users } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';

export default function SuppliersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);

  const { data, isLoading } = trpc.wholesale.listSuppliers.useQuery({
    filters: {
      search: search.trim() ? search.trim() : undefined,
      isActive: activeOnly || undefined,
    },
    pagination: { page, limit: 20, sortOrder: 'asc' },
  });
  const items = ((data?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Management"
        description="Supplier directory, performance ratings, and purchase history."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Suppliers' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add Supplier
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-4">
        <input
          type="search"
          placeholder="Search by name or GSTIN..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-9 w-full max-w-sm rounded-md border px-3 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => { setActiveOnly(e.target.checked); setPage(1); }}
          />
          Active only
        </label>
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>Name</span>
          <span>Type</span>
          <span>GSTIN</span>
          <span>City</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No suppliers"
            description="Add your first supplier to get started."
          />
        ) : (
          <div className="divide-y">
            {items.map((s) => (
              <Link
                key={s.id as string}
                href={`/wholesale/suppliers/${s.id}`}
                className="grid grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr] gap-4 px-4 py-3 text-sm hover:bg-accent"
              >
                <span className="font-medium">{s.name as string}</span>
                <span className="text-muted-foreground">{(s.supplierType as string) ?? '-'}</span>
                <span className="font-mono text-xs">{(s.gstinNumber as string) ?? '-'}</span>
                <span className="text-muted-foreground">{(s.city as string) ?? '-'}</span>
                <StatusBadge
                  label={s.isActive ? 'Active' : 'Inactive'}
                  variant={s.isActive ? 'success' : 'default'}
                />
              </Link>
            ))}
          </div>
        )}
      </div>

      {data && (
        <PaginationControls
          page={data.page}
          totalPages={data.totalPages}
          hasPrevious={data.hasPrevious}
          hasNext={data.hasNext}
          onChange={setPage}
        />
      )}
    </div>
  );
}
