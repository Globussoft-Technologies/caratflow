'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { CheckCircle, XCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDate } from '@/components/format';

export default function ReturnDetailPage() {
  const params = useParams<{ id: string }>();
  const returnId = params?.id ?? '';
  const { data, isLoading, refetch } = trpc.retail.getReturn.useQuery({ returnId }, { enabled: Boolean(returnId) });
  const approve = trpc.retail.approveReturn.useMutation({ onSuccess: () => refetch() });
  const complete = trpc.retail.completeReturn.useMutation({ onSuccess: () => refetch() });
  const reject = trpc.retail.rejectReturn.useMutation({ onSuccess: () => refetch() });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const r = data as Record<string, unknown>;
  const items = (r.items as Array<Record<string, unknown>>) ?? [];
  const status = r.status as string;

  return (
    <div className="space-y-6">
      <PageHeader
        title={(r.returnNumber as string) ?? 'Return'}
        description={`Status: ${status}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Retail', href: '/retail' },
          { label: 'Returns', href: '/retail/returns' },
          { label: (r.returnNumber as string) ?? '' },
        ]}
        actions={
          <div className="flex gap-2">
            {status === 'PENDING' && (
              <>
                <button onClick={() => approve.mutate({ returnId })} disabled={approve.isPending} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  <CheckCircle className="h-4 w-4" /> Approve
                </button>
                <button onClick={() => { const reason = prompt('Reason?'); if (reason) reject.mutate({ returnId, reason }); }} disabled={reject.isPending} className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm disabled:opacity-50">
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </>
            )}
            {status === 'APPROVED' && (
              <button onClick={() => complete.mutate({ returnId })} disabled={complete.isPending} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">
                <CheckCircle className="h-4 w-4" /> Complete
              </button>
            )}
            <StatusBadge label={status} variant={getStatusVariant(status)} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Original Sale</p><p className="text-sm font-medium mt-1 font-mono">{(((r.originalSale as { invoiceNumber?: string })?.invoiceNumber) as string) ?? '-'}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Refund Amount</p><p className="text-lg font-bold mt-1">{formatPaise(r.refundAmountPaise)}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Date</p><p className="text-sm font-medium mt-1">{formatDate(r.createdAt)}</p></div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Returned Items</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[2fr_0.6fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
            <span>Description</span>
            <span>Qty</span>
            <span>Reason</span>
            <span>Refund</span>
          </div>
          {items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No items</div>
          ) : (
            <div className="divide-y">
              {items.map((i, idx) => (
                <div key={(i.id as string) ?? idx} className="grid grid-cols-[2fr_0.6fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                  <span>{((i.product as { name?: string })?.name) ?? '-'}</span>
                  <span>{String(i.quantity ?? 0)}</span>
                  <span className="text-muted-foreground text-xs">{(i.reason as string) ?? '-'}</span>
                  <span className="font-semibold">{formatPaise(i.refundAmountPaise)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
