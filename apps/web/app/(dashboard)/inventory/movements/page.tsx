'use client';

import { useCallback, useState } from 'react';
import { PageHeader, DataTable, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Activity } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useRealtime } from '@/lib/realtime';
import type { ColumnDef } from '@caratflow/ui';
import { MovementType } from '@caratflow/shared-types';

interface MovementRow {
  id: string;
  movementType: string;
  quantityChange: number;
  movedAt: string;
  notes: string | null;
  referenceType: string | null;
  referenceId: string | null;
  stockItem?: {
    product?: { id: string; sku: string; name: string };
    location?: { id: string; name: string };
  };
}

export default function MovementsPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  const query = trpc.inventory.movements.list.useQuery({
    page,
    limit: 20,
    movementType: typeFilter ? (typeFilter as MovementType) : undefined,
  });
  const { data, isLoading } = query;

  // Live refetch when stock is adjusted elsewhere in the tenant.
  useRealtime(
    'inventory.stock.adjusted',
    useCallback(() => {
      void query.refetch();
    }, [query]),
  );

  const columns: ColumnDef<MovementRow, unknown>[] = [
    {
      accessorKey: 'stockItem.product.sku',
      header: 'SKU',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.stockItem?.product?.sku ?? '-'}</span>
      ),
    },
    {
      accessorKey: 'stockItem.product.name',
      header: 'Product',
      cell: ({ row }) => row.original.stockItem?.product?.name ?? '-',
    },
    {
      accessorKey: 'movementType',
      header: 'Type',
      cell: ({ row }) => (
        <StatusBadge label={row.original.movementType} variant={getStatusVariant(row.original.movementType)} />
      ),
    },
    {
      accessorKey: 'quantityChange',
      header: 'Qty Change',
      cell: ({ row }) => {
        const val = row.original.quantityChange;
        return (
          <span className={val > 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
            {val > 0 ? `+${val}` : val}
          </span>
        );
      },
    },
    {
      accessorKey: 'stockItem.location.name',
      header: 'Location',
      cell: ({ row }) => row.original.stockItem?.location?.name ?? '-',
    },
    {
      accessorKey: 'referenceType',
      header: 'Reference',
      cell: ({ row }) => row.original.referenceType ?? '-',
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate block">{row.original.notes ?? '-'}</span>
      ),
    },
    {
      accessorKey: 'movedAt',
      header: 'Date',
      cell: ({ row }) => new Date(row.original.movedAt).toLocaleString(),
    },
  ];

  const movementTypes = ['IN', 'OUT', 'TRANSFER', 'ADJUST', 'RETURN', 'PRODUCTION'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        description="Complete history of all stock changes."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Movements' },
        ]}
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">All Types</option>
          {movementTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={(data?.items as MovementRow[]) ?? []}
        isLoading={isLoading}
        pageSize={20}
      />

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={!data.hasPrevious}
            onClick={() => setPage((p) => p - 1)}
            className="h-8 rounded-md border px-3 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <button
            disabled={!data.hasNext}
            onClick={() => setPage((p) => p + 1)}
            className="h-8 rounded-md border px-3 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
