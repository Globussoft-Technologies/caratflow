'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDate } from '@/components/format';

export default function PreorderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data, isLoading } = trpc.preorder.getPreOrder.useQuery({ preOrderId: id }, { enabled: Boolean(id) });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const p: Record<string, unknown> = (data as unknown) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <PageHeader title={(p.preOrderNumber as string) ?? 'Pre-Order'} breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'Pre-Orders', href: '/ecommerce/preorders' },
        { label: (p.preOrderNumber as string) ?? '' },
      ]} actions={<StatusBadge label={(p.status as string) ?? '-'} variant={getStatusVariant(p.status as string)} />} />
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{(p.customerName as string) ?? '-'}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span>{(((p.product as { name?: string })?.name)) ?? '-'}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatPaise(p.totalPaise)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Deposit</span><span>{formatPaise(p.depositPaise)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Expected</span><span>{formatDate(p.expectedDate)}</span></div>
      </div>
    </div>
  );
}
