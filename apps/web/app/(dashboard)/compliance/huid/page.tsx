'use client';

import { useState } from 'react';
import { PageHeader, DataTable, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { ShieldCheck, Plus, Upload, Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { HuidBadge } from '@/features/compliance';
import type { ColumnDef } from '@caratflow/ui';

export default function HuidRegistryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = trpc.compliance.huid.list.useQuery({
    page,
    limit: 20,
    sortBy: 'registeredAt',
    sortOrder: 'desc',
    search: search || undefined,
  });

  const columns: ColumnDef<Record<string, unknown>, unknown>[] = [
    {
      accessorKey: 'huidNumber',
      header: 'HUID',
      cell: ({ row }) => (
        <Link
          href={`/compliance/huid/${row.original.id}`}
          className="font-mono font-medium text-primary hover:underline"
        >
          {row.original.huidNumber as string}
        </Link>
      ),
    },
    {
      accessorKey: 'product.sku',
      header: 'SKU',
      cell: ({ row }) => {
        const product = row.original.product as { sku: string; name: string } | undefined;
        return product?.sku ?? '-';
      },
    },
    {
      accessorKey: 'product.name',
      header: 'Product',
      cell: ({ row }) => {
        const product = row.original.product as { sku: string; name: string } | undefined;
        return product?.name ?? '-';
      },
    },
    {
      accessorKey: 'articleType',
      header: 'Article',
    },
    {
      accessorKey: 'metalType',
      header: 'Metal',
    },
    {
      accessorKey: 'purityFineness',
      header: 'Purity',
    },
    {
      accessorKey: 'weightMg',
      header: 'Weight',
      cell: ({ row }) => `${(Number(row.original.weightMg) / 1000).toFixed(2)}g`,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge
          label={row.original.status as string}
          variant={getStatusVariant(row.original.status as string)}
        />
      ),
    },
    {
      accessorKey: 'registeredAt',
      header: 'Registered',
      cell: ({ row }) => new Date(row.original.registeredAt as string).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="HUID Registry"
        description="Manage Hallmark Unique Identification numbers for gold jewelry."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'HUID Registry' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/compliance/hallmark/new"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Register HUID
            </Link>
          </div>
        }
      />

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by HUID, SKU, or product name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-md border bg-background pl-10 pr-4 py-2 text-sm"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={(data?.items as Record<string, unknown>[]) ?? []}
        isLoading={isLoading}
        pageSize={20}
      />

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages} ({data.total} records)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data.hasPrevious}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.hasNext}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
