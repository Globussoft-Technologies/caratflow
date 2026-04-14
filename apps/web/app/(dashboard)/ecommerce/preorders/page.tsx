'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, getStatusVariant, EmptyState } from '@caratflow/ui';
import { Clock } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatPaise, formatDate } from '@/components/format';

export default function PreordersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = trpc.preorder.listPreOrders.useQuery({ page, limit: 20 } as never);
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Pre-Orders" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'Pre-Orders' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Pre-Order #</span>
          <span>Customer</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Created</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Clock className="h-8 w-8" />} title="No pre-orders" />
        ) : (
          <div className="divide-y">
            {items.map((p) => (
              <Link key={p.id as string} href={`/ecommerce/preorders/${p.id}`} className="grid grid-cols-[1.2fr_1.4fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-mono font-medium">{(p.preOrderNumber as string) ?? '-'}</span>
                <span>{(p.customerName as string) ?? '-'}</span>
                <span className="font-semibold">{formatPaise(p.totalPaise ?? p.depositPaise)}</span>
                <StatusBadge label={(p.status as string) ?? '-'} variant={getStatusVariant(p.status as string)} dot={false} />
                <span className="text-muted-foreground">{formatDate(p.createdAt)}</span>
              </Link>
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
