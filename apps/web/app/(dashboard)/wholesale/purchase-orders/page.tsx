'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Plus, FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise, formatDate } from '@/components/format';

interface PORow {
  id: string;
  poNumber: string;
  status: string;
  totalPaise: string | number | bigint | null;
  expectedDeliveryDate: string | null;
  createdAt: string;
  supplier?: { name: string } | null;
  location?: { name: string } | null;
}

export default function PurchaseOrdersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = trpc.wholesale.listPurchaseOrders.useQuery({
    filters: {
      search: search || undefined,
      status: (status || undefined) as never,
    },
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });

  const items = (data?.items as PORow[] | undefined) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Create and manage purchase orders for suppliers."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Purchase Orders' },
        ]}
        actions={
          <Link
            href="/wholesale/purchase-orders/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New PO
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by PO number or supplier..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-9 w-72 rounded-md border bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="h-9 rounded-md border bg-transparent px-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="PARTIALLY_RECEIVED">Partially Received</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr_0.8fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>PO Number</span>
          <span>Supplier</span>
          <span>Location</span>
          <span>Total</span>
          <span>Status</span>
          <span>Expected</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No purchase orders"
            description="Create your first purchase order to get started."
          />
        ) : (
          <div className="divide-y">
            {items.map((po) => (
              <Link
                key={po.id}
                href={`/wholesale/purchase-orders/${po.id}`}
                className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr_0.8fr] gap-4 px-4 py-3 text-sm hover:bg-accent"
              >
                <span className="font-mono font-medium">{po.poNumber}</span>
                <span>{po.supplier?.name ?? '-'}</span>
                <span className="text-muted-foreground">{po.location?.name ?? '-'}</span>
                <span className="font-semibold">{formatPaise(po.totalPaise)}</span>
                <StatusBadge label={po.status.replace(/_/g, ' ')} variant={getStatusVariant(po.status)} dot={false} />
                <span className="text-muted-foreground">{formatDate(po.expectedDeliveryDate)}</span>
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
