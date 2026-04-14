'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Package, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

interface Receipt {
  id: string;
  receiptNumber: string;
  status: string;
  receivedAt: string;
  purchaseOrder?: { poNumber: string; supplier?: { name: string } | null } | null;
  items?: unknown[];
}

export default function GoodsReceiptsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.wholesale.listGoodsReceipts.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const items = (data?.items as Receipt[] | undefined) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receipts"
        description="Receive and inspect goods against purchase orders."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Goods Receipts' },
        ]}
        actions={
          <Link
            href="/wholesale/purchase-orders"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Receive Against PO
          </Link>
        }
      />

      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.2fr_1.4fr_1fr_0.8fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <span>Receipt #</span>
          <span>PO Number</span>
          <span>Supplier</span>
          <span>Status</span>
          <span>Items</span>
          <span>Received</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Package className="h-8 w-8" />} title="No goods receipts yet" />
        ) : (
          <div className="divide-y">
            {items.map((r) => (
              <div key={r.id} className="grid grid-cols-[1.2fr_1.2fr_1.4fr_1fr_0.8fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-mono font-medium">{r.receiptNumber}</span>
                <span className="font-mono text-muted-foreground">{r.purchaseOrder?.poNumber ?? '-'}</span>
                <span>{r.purchaseOrder?.supplier?.name ?? '-'}</span>
                <StatusBadge label={r.status} variant={getStatusVariant(r.status)} dot={false} />
                <span>{r.items?.length ?? 0}</span>
                <span className="text-muted-foreground">{formatDate(r.receivedAt)}</span>
              </div>
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
