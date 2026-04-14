'use client';

import { useParams, useRouter } from 'next/navigation';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Send, XCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDate } from '@/components/format';

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const poId = params?.id ?? '';
  const { data: po, isLoading, refetch } = trpc.wholesale.getPurchaseOrder.useQuery(
    { poId },
    { enabled: Boolean(poId) },
  );
  const send = trpc.wholesale.sendPurchaseOrder.useMutation({ onSuccess: () => refetch() });
  const cancel = trpc.wholesale.cancelPurchaseOrder.useMutation({ onSuccess: () => refetch() });

  if (isLoading || !po) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  }

  const p = po as Record<string, unknown>;
  const items = ((p.items as Array<Record<string, unknown>>) ?? []);
  const status = p.status as string;

  return (
    <div className="space-y-6">
      <PageHeader
        title={(p.poNumber as string) ?? 'Purchase Order'}
        description={`Status: ${status}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Purchase Orders', href: '/wholesale/purchase-orders' },
          { label: (p.poNumber as string) ?? 'PO' },
        ]}
        actions={
          <div className="flex gap-2">
            {status === 'DRAFT' && (
              <button
                onClick={() => send.mutate({ poId })}
                disabled={send.isPending}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Send to Supplier
              </button>
            )}
            {(status === 'DRAFT' || status === 'SENT') && (
              <button
                onClick={() => {
                  const reason = prompt('Reason for cancellation?');
                  if (reason) cancel.mutate({ poId, reason });
                }}
                disabled={cancel.isPending}
                className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Supplier</span><span>{((p.supplier as { name?: string })?.name) ?? '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span>{((p.location as { name?: string })?.name) ?? '-'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge label={status} variant={getStatusVariant(status)} /></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Expected Delivery</span><span>{formatDate(p.expectedDeliveryDate)}</span></div>
        </div>
        <div className="rounded-lg border p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPaise(p.subtotalPaise)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatPaise(p.taxPaise)}</span></div>
          <div className="flex justify-between font-semibold"><span>Total</span><span>{formatPaise(p.totalPaise)}</span></div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Line Items</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
            <span>Description</span>
            <span>Qty</span>
            <span>Received</span>
            <span>Unit Price</span>
            <span>Total</span>
          </div>
          {items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No items</div>
          ) : (
            <div className="divide-y">
              {items.map((it, idx) => (
                <div key={(it.id as string) ?? idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                  <span>{(it.description as string) ?? ((it.product as { name?: string })?.name) ?? '-'}</span>
                  <span>{String(it.quantity ?? 0)}</span>
                  <span>{String(it.receivedQuantity ?? 0)}</span>
                  <span>{formatPaise(it.unitPricePaise)}</span>
                  <span className="font-semibold">{formatPaise(it.totalPaise)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button onClick={() => router.push('/wholesale/purchase-orders')} className="text-sm text-primary hover:underline">
        &larr; Back to purchase orders
      </button>
    </div>
  );
}
