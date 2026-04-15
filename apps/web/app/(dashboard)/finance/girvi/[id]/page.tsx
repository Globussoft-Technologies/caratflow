'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDate } from '@/components/format';

export default function GirviDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  // Cast through `unknown` to avoid TS2589 (excessively deep instantiation from tRPC + Zod schema recursion).
  const query = (trpc.india.girvi.getById as unknown as {
    useQuery: (
      input: { id: string },
      opts: { enabled: boolean },
    ) => { data: unknown; isLoading: boolean };
  }).useQuery({ id }, { enabled: Boolean(id) });
  const { data, isLoading } = query;

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const g = data as Record<string, unknown>;
  const customer = g.customer as { firstName?: string; lastName?: string } | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={(g.loanNumber as string) ?? 'Girvi'}
        description={customer ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() : ''}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Girvi', href: '/finance/girvi' },
          { label: (g.loanNumber as string) ?? '' },
        ]}
        actions={<StatusBadge label={(g.status as string) ?? '-'} variant="default" />}
      />
      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Principal</span><span>{formatPaise(g.principalPaise)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Interest Rate</span><span>{String(g.interestRatePercent ?? '-')}%</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Outstanding</span><span className="font-semibold">{formatPaise(g.outstandingPaise)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Issued</span><span>{formatDate(g.issuedDate)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span>{formatDate(g.dueDate)}</span></div>
      </div>
    </div>
  );
}
