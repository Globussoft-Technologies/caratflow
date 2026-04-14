'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDate } from '@/components/format';

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data, isLoading } = trpc.wholesale.getAgent.useQuery({ agentId: id }, { enabled: Boolean(id) });
  const { data: commissionsData } = trpc.wholesale.listCommissions.useQuery({
    filters: { agentBrokerId: id },
    pagination: { page: 1, limit: 50, sortOrder: 'desc' },
  }, { enabled: Boolean(id) });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const a = data as Record<string, unknown>;
  const commissions = ((commissionsData?.items as Array<Record<string, unknown>>) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={a.name as string}
        description={`Agent / Broker - ${a.commissionType as string}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Agents', href: '/wholesale/agents' },
          { label: a.name as string },
        ]}
        actions={<StatusBadge label={a.isActive ? 'Active' : 'Inactive'} variant={a.isActive ? 'success' : 'default'} />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Contact</p>
          <p className="text-sm font-medium mt-1">{(a.phone as string) ?? '-'}</p>
          <p className="text-sm text-muted-foreground">{(a.email as string) ?? '-'}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Commission Type</p>
          <p className="text-sm font-medium mt-1">{a.commissionType as string}</p>
          <p className="text-sm text-muted-foreground">Value: {String(a.commissionValue ?? '-')}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">PAN</p>
          <p className="text-sm font-medium mt-1">{(a.panNumber as string) ?? '-'}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Commission History</h2>
        <div className="rounded-lg border">
          <div className="grid grid-cols-5 gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
            <div>Type</div>
            <div>Reference</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Date</div>
          </div>
          {commissions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No commissions yet</div>
          ) : (
            <div className="divide-y">
              {commissions.map((c) => (
                <div key={c.id as string} className="grid grid-cols-5 gap-4 px-4 py-3 text-sm">
                  <span>{(c.referenceType as string) ?? '-'}</span>
                  <span className="font-mono text-xs">{((c.referenceId as string) ?? '').slice(0, 8)}</span>
                  <span className="font-semibold">{formatPaise(c.commissionAmountPaise)}</span>
                  <span>{c.status as string}</span>
                  <span className="text-muted-foreground">{formatDate(c.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
