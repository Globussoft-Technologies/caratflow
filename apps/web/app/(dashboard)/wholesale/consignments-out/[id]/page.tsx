'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDate, formatMg } from '@/components/format';

export default function ConsignmentOutDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data, isLoading, refetch } = trpc.wholesale.getConsignmentOut.useQuery({ id }, { enabled: Boolean(id) });
  const issue = trpc.wholesale.issueConsignmentOut.useMutation({ onSuccess: () => refetch() });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const c = data as Record<string, unknown>;
  const items = (c.items as Array<Record<string, unknown>>) ?? [];
  const status = c.status as string;

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.consignmentNumber as string}
        description={`Outgoing consignment — ${status}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Consignments Out', href: '/wholesale/consignments-out' },
          { label: c.consignmentNumber as string },
        ]}
        actions={
          <div className="flex gap-2">
            {status === 'DRAFT' && (
              <button
                onClick={() => issue.mutate({ id })}
                disabled={issue.isPending}
                className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Issue
              </button>
            )}
            <StatusBadge label={status.replace(/_/g, ' ')} variant={getStatusVariant(status)} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Customer</p><p className="text-sm font-medium">{(((c.customer as Record<string, unknown>)?.firstName as string) ?? '-')}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Issued</p><p className="text-sm font-medium">{formatDate(c.issuedDate)}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Due</p><p className="text-sm font-medium">{formatDate(c.dueDate)}</p></div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Items</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
            <span>Product</span>
            <span>Qty</span>
            <span>Weight</span>
            <span>Value</span>
            <span>Returned</span>
            <span>Sold</span>
          </div>
          {items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No items</div>
          ) : (
            <div className="divide-y">
              {items.map((i) => (
                <div key={i.id as string} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                  <span>{((i.product as { name?: string })?.name) ?? '-'}</span>
                  <span>{String(i.quantity ?? 0)}</span>
                  <span>{formatMg(i.weightMg)}</span>
                  <span>{formatPaise(i.valuePaise)}</span>
                  <span>{String(i.returnedQuantity ?? 0)}</span>
                  <span>{String(i.soldQuantity ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
