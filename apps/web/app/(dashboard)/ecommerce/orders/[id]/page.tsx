'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDateTime } from '@/components/format';

export default function EcommerceOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id ?? '';
  const { data, isLoading } = trpc.ecommerce.getOrder.useQuery({ orderId }, { enabled: Boolean(orderId) });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const o: Record<string, unknown> = (data as unknown) as Record<string, unknown>;
  const items = (o.items as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={(o.orderNumber as string) ?? (o.externalOrderId as string) ?? 'Order'} breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'Orders', href: '/ecommerce/orders' },
        { label: (o.orderNumber as string) ?? '' },
      ]} actions={<StatusBadge label={(o.status as string) ?? '-'} variant={getStatusVariant(o.status as string)} />} />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Customer</p><p className="text-sm font-medium mt-1">{(o.customerName as string) ?? '-'}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Placed</p><p className="text-sm font-medium mt-1">{formatDateTime(o.placedAt ?? o.createdAt)}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold mt-1">{formatPaise(o.totalPaise)}</p></div>
      </div>
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Items</h2>
        <div className="rounded-lg border">
          {items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No items</div>
          ) : (
            <div className="divide-y">
              {items.map((i, idx) => (
                <div key={(i.id as string) ?? idx} className="grid grid-cols-[2fr_0.6fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                  <span>{(i.title as string) ?? (((i.product as { name?: string })?.name)) ?? '-'}</span>
                  <span>{String(i.quantity ?? 0)}</span>
                  <span>{formatPaise(i.unitPricePaise)}</span>
                  <span className="font-semibold">{formatPaise(i.totalPaise)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
