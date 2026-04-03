'use client';

import { useState } from 'react';
import { PageHeader, DataTable, StatusBadge } from '@caratflow/ui';
import { Package, Plus, ArrowRightLeft, Download } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ColumnDef } from '@caratflow/ui';
import { StockItemForm } from '@/features/inventory/stock-item-form';

interface StockItemRow {
  id: string;
  productId: string;
  locationId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  quantityOnOrder: number;
  reorderLevel: number;
  binLocation: string | null;
  product?: { id: string; sku: string; name: string; productType: string; costPricePaise: number | null; sellingPricePaise: number | null };
  location?: { id: string; name: string; locationType: string };
}

export default function StockItemsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [locationFilter, setLocationFilter] = useState(searchParams.get('locationId') ?? '');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('lowStock') === 'true');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = trpc.inventory.stockItems.list.useQuery({
    page,
    limit: 20,
    locationId: locationFilter || undefined,
    lowStockOnly,
    search: search || undefined,
  });

  const columns: ColumnDef<StockItemRow, unknown>[] = [
    {
      accessorKey: 'product.sku',
      header: 'SKU',
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.product?.sku ?? '-'}</span>
      ),
    },
    {
      accessorKey: 'product.name',
      header: 'Product Name',
      cell: ({ row }) => row.original.product?.name ?? '-',
    },
    {
      accessorKey: 'location.name',
      header: 'Location',
      cell: ({ row }) => row.original.location?.name ?? '-',
    },
    {
      accessorKey: 'quantityOnHand',
      header: 'On Hand',
      cell: ({ row }) => row.original.quantityOnHand,
    },
    {
      accessorKey: 'quantityReserved',
      header: 'Reserved',
      cell: ({ row }) => row.original.quantityReserved,
    },
    {
      accessorKey: 'quantityAvailable',
      header: 'Available',
      cell: ({ row }) => {
        const available = row.original.quantityAvailable;
        return (
          <span className={available <= 0 ? 'text-red-600 font-medium' : ''}>
            {available}
          </span>
        );
      },
    },
    {
      accessorKey: 'product.costPricePaise',
      header: 'Value',
      cell: ({ row }) => {
        const cost = row.original.product?.costPricePaise;
        if (!cost) return '-';
        const totalValue = (cost * row.original.quantityOnHand) / 100;
        return totalValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const { quantityOnHand, reorderLevel } = row.original;
        if (quantityOnHand <= 0) return <StatusBadge label="Out of Stock" variant="danger" />;
        if (reorderLevel > 0 && quantityOnHand <= reorderLevel)
          return <StatusBadge label="Low Stock" variant="warning" />;
        return <StatusBadge label="In Stock" variant="success" />;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Items"
        description="View and manage stock across all locations."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Items' },
        ]}
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Stock Item
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by SKU or name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-9 w-64 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => { setLowStockOnly(e.target.checked); setPage(1); }}
            className="rounded border"
          />
          Low Stock Only
        </label>
      </div>

      <DataTable
        columns={columns}
        data={(data?.items as StockItemRow[]) ?? []}
        isLoading={isLoading}
        pageSize={20}
        onRowClick={(row) => router.push(`/inventory/items/${row.id}`)}
      />

      {/* Pagination controls */}
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

      {showForm && (
        <StockItemForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch(); }}
        />
      )}
    </div>
  );
}
