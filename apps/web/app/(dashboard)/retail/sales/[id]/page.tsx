'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Ban, Printer } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDateTime } from '@/components/format';

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const saleId = params?.id ?? '';
  const { data, isLoading, refetch } = trpc.retail.getSale.useQuery({ saleId }, { enabled: Boolean(saleId) });
  const voidMut = trpc.retail.voidSale.useMutation({ onSuccess: () => refetch() });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;

  const s = data as Record<string, unknown>;
  const items = (s.items as Array<Record<string, unknown>>) ?? [];
  const status = s.status as string;
  const customer = s.customer as { firstName?: string; lastName?: string; phone?: string } | undefined;
  const customerName = customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : 'Walk-in';

  return (
    <div className="space-y-6">
      <PageHeader
        title={(s.invoiceNumber as string) ?? 'Sale'}
        description={`${customerName} — ${status}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Retail', href: '/retail' },
          { label: 'Sales', href: '/retail/sales' },
          { label: (s.invoiceNumber as string) ?? '' },
        ]}
        actions={
          <div className="flex gap-2">
            <button className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm hover:bg-accent">
              <Printer className="h-4 w-4" /> Print
            </button>
            {status !== 'VOIDED' && (
              <button
                onClick={() => {
                  const reason = prompt('Reason for voiding?');
                  if (reason) voidMut.mutate({ saleId, reason });
                }}
                disabled={voidMut.isPending}
                className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm hover:bg-accent disabled:opacity-50"
              >
                <Ban className="h-4 w-4" /> Void
              </button>
            )}
            <StatusBadge label={status} variant={getStatusVariant(status)} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Customer</p><p className="text-sm font-medium mt-1">{customerName}</p><p className="text-xs text-muted-foreground">{customer?.phone ?? ''}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Date</p><p className="text-sm font-medium mt-1">{formatDateTime(s.saleDate ?? s.createdAt)}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold mt-1">{formatPaise(s.totalPaise)}</p></div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Line Items</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[2fr_0.6fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit Price</span>
            <span>Total</span>
          </div>
          {items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No items</div>
          ) : (
            <div className="divide-y">
              {items.map((i, idx) => (
                <div key={(i.id as string) ?? idx} className="grid grid-cols-[2fr_0.6fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                  <span>{(i.description as string) ?? ((i.product as { name?: string })?.name) ?? '-'}</span>
                  <span>{String(i.quantity ?? 0)}</span>
                  <span>{formatPaise(i.unitPricePaise)}</span>
                  <span className="font-semibold">{formatPaise(i.lineTotalPaise ?? i.totalPaise)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-2 text-sm max-w-sm ml-auto">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPaise(s.subtotalPaise)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatPaise(s.taxPaise)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>{formatPaise(s.discountPaise)}</span></div>
        <div className="flex justify-between font-semibold text-base border-t pt-2"><span>Total</span><span>{formatPaise(s.totalPaise)}</span></div>
      </div>
    </div>
  );
}
