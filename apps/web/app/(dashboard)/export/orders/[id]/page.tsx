'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDate } from '@/components/format';

export default function ExportOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id ?? '';
  const { data, isLoading, refetch } = trpc.export.getOrder.useQuery({ orderId }, { enabled: Boolean(orderId) });
  const confirm = trpc.export.confirmOrder.useMutation({ onSuccess: () => refetch() });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const o: Record<string, unknown> = (data as unknown) as Record<string, unknown>;
  const status = o.status as string;

  return (
    <div className="space-y-6">
      <PageHeader title={(o.orderNumber as string) ?? 'Export Order'} breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Export', href: '/export' },
        { label: 'Orders', href: '/export/orders' },
        { label: (o.orderNumber as string) ?? '' },
      ]} actions={
        <div className="flex gap-2">
          {status === 'DRAFT' && <button onClick={() => confirm.mutate({ orderId })} disabled={confirm.isPending} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">Confirm</button>}
          <StatusBadge label={status} variant={getStatusVariant(status)} />
        </div>
      } />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Buyer</p><p className="text-sm font-medium mt-1">{(o.buyerName as string) ?? '-'}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Destination</p><p className="text-sm font-medium mt-1">{(o.destinationCountry as string) ?? '-'}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Total Value</p><p className="text-lg font-bold mt-1">{formatPaise(o.totalValuePaise)}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Order Date</p><p className="text-sm font-medium mt-1">{formatDate(o.orderDate)}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Shipment Date</p><p className="text-sm font-medium mt-1">{formatDate(o.shipmentDate)}</p></div>
      </div>
    </div>
  );
}
