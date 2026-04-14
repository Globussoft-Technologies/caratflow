'use client';

import { useState } from 'react';
import { PageHeader, DataTable, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { ClipboardCheck, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import type { ColumnDef } from '@caratflow/ui';
import { StockTakeForm } from '@/features/inventory/stock-take-form';
import { VarianceDisplay } from '@/features/inventory/variance-display';
import { StockTakeStatus } from '@caratflow/shared-types';

interface StockTakeRow {
  id: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  location?: { id: string; name: string };
  items?: Array<{
    id: string;
    productId: string;
    systemQuantity: number;
    countedQuantity: number | null;
    varianceQuantity: number | null;
    notes: string | null;
    product?: { sku: string; name: string };
  }>;
}

export default function StockTakesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedTake, setSelectedTake] = useState<StockTakeRow | null>(null);

  const { data, isLoading, refetch } = trpc.inventory.stockTakes.list.useQuery({
    page,
    limit: 20,
    status: statusFilter ? (statusFilter as StockTakeStatus) : undefined,
  });

  const completeMutation = trpc.inventory.stockTakes.complete.useMutation({
    onSuccess: () => { refetch(); setSelectedTake(null); },
  });

  const addCountsMutation = trpc.inventory.stockTakes.addCounts.useMutation({
    onSuccess: () => refetch(),
  });

  const columns: ColumnDef<StockTakeRow, unknown>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.id.slice(0, 8)}...</span>
      ),
    },
    {
      accessorKey: 'location.name',
      header: 'Location',
      cell: ({ row }) => row.original.location?.name ?? '-',
    },
    {
      id: 'itemCount',
      header: 'Items',
      cell: ({ row }) => row.original.items?.length ?? 0,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge label={row.original.status.replace('_', ' ')} variant={getStatusVariant(row.original.status)} />
      ),
    },
    {
      accessorKey: 'startedAt',
      header: 'Started',
      cell: ({ row }) =>
        row.original.startedAt ? new Date(row.original.startedAt).toLocaleString() : '-',
    },
    {
      accessorKey: 'completedAt',
      header: 'Completed',
      cell: ({ row }) =>
        row.original.completedAt ? new Date(row.original.completedAt).toLocaleString() : '-',
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Takes"
        description="Physical inventory audits and variance tracking."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Stock Takes' },
        ]}
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Stock Take
          </button>
        }
      />

      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={(data?.items as StockTakeRow[]) ?? []}
        isLoading={isLoading}
        pageSize={20}
        onRowClick={(row) => setSelectedTake(row)}
      />

      {/* Stock Take Detail Panel */}
      {selectedTake && (
        <div className="rounded-lg border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              Stock Take at {selectedTake.location?.name ?? '-'}
              <StatusBadge
                label={selectedTake.status.replace('_', ' ')}
                variant={getStatusVariant(selectedTake.status)}
                className="ml-2"
              />
            </h3>
            <div className="flex gap-2">
              {(selectedTake.status === 'DRAFT' || selectedTake.status === 'IN_PROGRESS') && (
                <button
                  onClick={() => completeMutation.mutate({ id: selectedTake.id })}
                  disabled={completeMutation.isPending}
                  className="h-8 rounded-md bg-emerald-600 px-3 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Complete
                </button>
              )}
              <button
                onClick={() => setSelectedTake(null)}
                className="h-8 rounded-md border px-3 text-sm"
              >
                Close
              </button>
            </div>
          </div>

          {/* Count Entry Form */}
          {selectedTake.items && selectedTake.items.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Items</h4>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="h-9 px-3 text-left font-medium text-muted-foreground">SKU</th>
                      <th className="h-9 px-3 text-left font-medium text-muted-foreground">Product</th>
                      <th className="h-9 px-3 text-left font-medium text-muted-foreground">System Qty</th>
                      <th className="h-9 px-3 text-left font-medium text-muted-foreground">Counted</th>
                      <th className="h-9 px-3 text-left font-medium text-muted-foreground">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTake.items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="px-3 py-2 font-mono text-xs">{item.product?.sku ?? '-'}</td>
                        <td className="px-3 py-2">{item.product?.name ?? '-'}</td>
                        <td className="px-3 py-2">{item.systemQuantity}</td>
                        <td className="px-3 py-2">
                          {selectedTake.status === 'DRAFT' || selectedTake.status === 'IN_PROGRESS' ? (
                            <input
                              type="number"
                              defaultValue={item.countedQuantity ?? ''}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                  addCountsMutation.mutate({
                                    stockTakeId: selectedTake.id,
                                    counts: [{ productId: item.productId, countedQuantity: val }],
                                  });
                                }
                              }}
                              className="h-7 w-20 rounded border px-2 text-sm"
                              min={0}
                            />
                          ) : (
                            item.countedQuantity ?? '-'
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <VarianceDisplay variance={item.varianceQuantity} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

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
        <StockTakeForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch(); }}
        />
      )}
    </div>
  );
}
