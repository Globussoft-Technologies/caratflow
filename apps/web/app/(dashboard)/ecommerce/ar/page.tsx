'use client';

import { PageHeader, EmptyState } from '@caratflow/ui';
import { Glasses } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function ArProductsPage() {
  const { data, isLoading } = trpc.ar.listArProducts.useQuery({} as never);
  const items = ((data as Array<Record<string, unknown>> | { items?: Array<Record<string, unknown>> } | undefined));
  const rows = Array.isArray(items) ? items : (items?.items ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="AR Try-On Catalog" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'AR' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Product</span>
          <span>Assets</span>
          <span>Status</span>
          <span>Views</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Glasses className="h-8 w-8" />} title="No AR products" />
        ) : (
          <div className="divide-y">
            {rows.map((p) => (
              <div key={p.id as string} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{(p.name as string) ?? '-'}</span>
                <span>{String((p.arAssets as unknown[] | undefined)?.length ?? p.assetCount ?? 0)}</span>
                <span>{(p.processingStatus as string) ?? '-'}</span>
                <span>{String(p.viewCount ?? 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
