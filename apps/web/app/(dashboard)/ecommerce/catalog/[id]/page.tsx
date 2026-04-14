'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDateTime } from '@/components/format';

export default function CatalogItemDetailPage() {
  const params = useParams<{ id: string }>();
  const catalogItemId = params?.id ?? '';
  const { data, isLoading } = trpc.ecommerce.getCatalogItem.useQuery({ catalogItemId }, { enabled: Boolean(catalogItemId) });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const c: Record<string, unknown> = (data as unknown) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <PageHeader title={(((c.product as { name?: string })?.name)) ?? 'Catalog Item'} breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'Catalog', href: '/ecommerce/catalog' },
        { label: (((c.product as { name?: string })?.name)) ?? '' },
      ]} actions={<StatusBadge label={(c.syncStatus as string) ?? '-'} variant="default" />} />
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Channel</span><span>{(((c.channel as { name?: string })?.name)) ?? '-'}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span>{formatPaise(c.pricePaise)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Last Sync</span><span>{formatDateTime(c.lastSyncAt)}</span></div>
      </div>
    </div>
  );
}
