'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatMg } from '@/components/format';

export default function BomDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data, isLoading, refetch } = trpc.manufacturing.bom.getById.useQuery({ id }, { enabled: Boolean(id) });
  const activate = trpc.manufacturing.bom.activate.useMutation({ onSuccess: () => refetch() });
  const archive = trpc.manufacturing.bom.archive.useMutation({ onSuccess: () => refetch() });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const b = data as Record<string, unknown>;
  const components = (b.components as Array<Record<string, unknown>>) ?? [];
  const status = b.status as string;

  return (
    <div className="space-y-6">
      <PageHeader
        title={(b.name as string) ?? 'BOM'}
        description={`Version ${b.version} — ${status}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Manufacturing', href: '/manufacturing' },
          { label: 'BOM', href: '/manufacturing/bom' },
          { label: (b.name as string) ?? '' },
        ]}
        actions={
          <div className="flex gap-2">
            {status === 'DRAFT' && <button onClick={() => activate.mutate({ id })} disabled={activate.isPending} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">Activate</button>}
            {status === 'ACTIVE' && <button onClick={() => archive.mutate({ id })} disabled={archive.isPending} className="h-9 rounded-md border px-4 text-sm disabled:opacity-50">Archive</button>}
            <StatusBadge label={status} variant={getStatusVariant(status)} />
          </div>
        }
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Components</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
            <span>Component</span>
            <span>Qty / Weight</span>
            <span>Unit Cost</span>
            <span>Total</span>
          </div>
          {components.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No components</div>
          ) : (
            <div className="divide-y">
              {components.map((c, idx) => (
                <div key={(c.id as string) ?? idx} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                  <span>{((c.product as { name?: string })?.name) ?? (c.description as string) ?? '-'}</span>
                  <span>{c.weightMg ? formatMg(c.weightMg) : String(c.quantity ?? 0)}</span>
                  <span>{formatPaise(c.unitCostPaise)}</span>
                  <span className="font-semibold">{formatPaise(c.totalCostPaise)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
