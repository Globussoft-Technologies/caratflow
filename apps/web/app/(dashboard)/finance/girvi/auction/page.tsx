'use client';

import { PageHeader, EmptyState } from '@caratflow/ui';
import { Gavel } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatPaise, formatDate } from '@/components/format';

export default function GirviAuctionPage() {
  const { data, isLoading } = trpc.india.girvi.listAuctions.useQuery({} as never);
  const items = ((data as Array<Record<string, unknown>> | { items?: Array<Record<string, unknown>> } | undefined));
  const rows = Array.isArray(items) ? items : (items?.items ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Girvi Auctions" description="Defaulted loan auctions." breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance', href: '/finance' },
        { label: 'Girvi', href: '/finance/girvi' },
        { label: 'Auctions' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Loan #</span>
          <span>Customer</span>
          <span>Outstanding</span>
          <span>Auction Date</span>
          <span>Status</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Gavel className="h-8 w-8" />} title="No auctions scheduled" />
        ) : (
          <div className="divide-y">
            {rows.map((a) => (
              <div key={a.id as string} className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-mono">{(a.loanNumber as string) ?? '-'}</span>
                <span>{(a.customerName as string) ?? '-'}</span>
                <span>{formatPaise(a.outstandingPaise)}</span>
                <span className="text-muted-foreground">{formatDate(a.auctionDate)}</span>
                <span>{(a.status as string) ?? '-'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
