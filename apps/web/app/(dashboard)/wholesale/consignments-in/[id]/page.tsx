'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDate, formatMg } from '@/components/format';

export default function ConsignmentInDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data, isLoading } = trpc.wholesale.getConsignmentIn.useQuery({ id }, { enabled: Boolean(id) });
  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;

  const c = data as Record<string, unknown>;
  const items = (c.items as Array<Record<string, unknown>>) ?? [];
  const status = c.status as string;

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.consignmentNumber as string}
        description={`Incoming consignment — ${status}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Consignments In', href: '/wholesale/consignments-in' },
          { label: c.consignmentNumber as string },
        ]}
        actions={<StatusBadge label={status.replace(/_/g, ' ')} variant={getStatusVariant(status)} />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Supplier</p><p className="text-sm font-medium">{((c.supplier as { name?: string })?.name) ?? '-'}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Received</p><p className="text-sm font-medium">{formatDate(c.receivedDate)}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Due</p><p className="text-sm font-medium">{formatDate(c.dueDate)}</p></div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Items</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
            <span>Product</span>
            <span>Qty</span>
            <span>Weight</span>
            <span>Value</span>
            <span>Returned</span>
          </div>
          {items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No items</div>
          ) : (
            <div className="divide-y">
              {items.map((i) => (
                <div key={i.id as string} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                  <span>{((i.product as { name?: string })?.name) ?? '-'}</span>
                  <span>{String(i.quantity ?? 0)}</span>
                  <span>{formatMg(i.weightMg)}</span>
                  <span>{formatPaise(i.valuePaise)}</span>
                  <span>{String(i.returnedQuantity ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
