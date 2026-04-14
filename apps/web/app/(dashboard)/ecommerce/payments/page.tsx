'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { CreditCard } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise, formatDateTime } from '@/components/format';

export default function EcommercePaymentsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.ecommerce.listPayments.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Online Payments" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'Payments' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Payment ID</span>
          <span>Gateway</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<CreditCard className="h-8 w-8" />} title="No payments" />
        ) : (
          <div className="divide-y">
            {items.map((p) => (
              <div key={p.id as string} className="grid grid-cols-[1.2fr_1.2fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm">
                <span className="font-mono text-xs">{(p.externalPaymentId as string) ?? (p.id as string)}</span>
                <span>{(((p.gateway as { name?: string })?.name)) ?? '-'}</span>
                <span className="font-semibold">{formatPaise(p.amountPaise)}</span>
                <StatusBadge label={(p.status as string) ?? '-'} variant="default" />
                <span className="text-muted-foreground">{formatDateTime(p.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {d && d.totalPages && d.totalPages > 0 && (
        <PaginationControls page={d.page ?? 1} totalPages={d.totalPages} hasPrevious={d.hasPrevious ?? false} hasNext={d.hasNext ?? false} onChange={setPage} />
      )}
    </div>
  );
}
