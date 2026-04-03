'use client';

import { useState } from 'react';
import { PageHeader, DataTable, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { ArrowRightLeft, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import type { ColumnDef } from '@caratflow/ui';
import { TransferForm } from '@/features/inventory/transfer-form';

interface TransferRow {
  id: string;
  status: string;
  fromLocation?: { id: string; name: string };
  toLocation?: { id: string; name: string };
  requestedBy: string | null;
  approvedBy: string | null;
  notes: string | null;
  createdAt: string;
  items?: Array<{
    id: string;
    productId: string;
    quantityRequested: number;
    quantityShipped: number;
    quantitySent: number;
    quantityReceived: number;
    product?: { sku: string; name: string };
  }>;
}

export default function TransfersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, refetch } = trpc.inventory.transfers.list.useQuery({
    page,
    limit: 20,
    status: statusFilter ? (statusFilter as 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED') : undefined,
  });

  const approveMutation = trpc.inventory.transfers.approve.useMutation({
    onSuccess: () => refetch(),
  });
  const receiveMutation = trpc.inventory.transfers.receive.useMutation({
    onSuccess: () => refetch(),
  });
  const cancelMutation = trpc.inventory.transfers.cancel.useMutation({
    onSuccess: () => refetch(),
  });

  const columns: ColumnDef<TransferRow, unknown>[] = [
    {
      accessorKey: 'id',
      header: 'Transfer ID',
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.id.slice(0, 8)}...</span>
      ),
    },
    {
      accessorKey: 'fromLocation.name',
      header: 'From',
      cell: ({ row }) => row.original.fromLocation?.name ?? '-',
    },
    {
      accessorKey: 'toLocation.name',
      header: 'To',
      cell: ({ row }) => row.original.toLocation?.name ?? '-',
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
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const { status, id } = row.original;
        return (
          <div className="flex items-center gap-1">
            {status === 'DRAFT' && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); approveMutation.mutate({ id }); }}
                  className="h-7 rounded-md bg-primary px-2 text-xs text-primary-foreground hover:bg-primary/90"
                >
                  Approve
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); cancelMutation.mutate({ id }); }}
                  className="h-7 rounded-md border px-2 text-xs hover:bg-destructive/10"
                >
                  Cancel
                </button>
              </>
            )}
            {status === 'IN_TRANSIT' && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); receiveMutation.mutate({ id }); }}
                  className="h-7 rounded-md bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-700"
                >
                  Receive
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); cancelMutation.mutate({ id }); }}
                  className="h-7 rounded-md border px-2 text-xs hover:bg-destructive/10"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Transfers"
        description="Manage transfers between locations."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Transfers' },
        ]}
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Transfer
          </button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={(data?.items as TransferRow[]) ?? []}
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

      {showForm && (
        <TransferForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); refetch(); }}
        />
      )}
    </div>
  );
}
