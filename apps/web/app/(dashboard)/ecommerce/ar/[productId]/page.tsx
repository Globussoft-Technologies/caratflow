'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatDateTime } from '@/components/format';

export default function ArProductDetailPage() {
  const params = useParams<{ productId: string }>();
  const productId = params?.productId ?? '';
  const { data, isLoading } = trpc.ar.getAssetsForProduct.useQuery({ productId }, { enabled: Boolean(productId) });
  const assets = ((data as Array<Record<string, unknown>> | undefined) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="AR Assets" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'AR', href: '/ecommerce/ar' },
        { label: productId },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Asset Type</span>
          <span>Status</span>
          <span>Active</span>
          <span>Uploaded</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : assets.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No assets</div>
        ) : (
          <div className="divide-y">
            {assets.map((a) => (
              <div key={a.id as string} className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span>{(a.assetType as string) ?? '-'}</span>
                <span>{(a.processingStatus as string) ?? '-'}</span>
                <span>{a.isActive ? 'Yes' : 'No'}</span>
                <span className="text-muted-foreground">{formatDateTime(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
