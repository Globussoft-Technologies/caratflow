'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { Star } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { PaginationControls } from '@/components/pagination-controls';
import { formatDate } from '@/components/format';

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = trpc.ecommerce.listReviews.useQuery({
    pagination: { page, limit: 20, sortOrder: 'desc' },
  });
  const publish = trpc.ecommerce.publishReview.useMutation({ onSuccess: () => refetch() });
  const unpublish = trpc.ecommerce.unpublishReview.useMutation({ onSuccess: () => refetch() });
  const d = data as { items?: Array<Record<string, unknown>>; totalPages?: number; page?: number; hasPrevious?: boolean; hasNext?: boolean } | undefined;
  const items = d?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Product Reviews" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'E-Commerce', href: '/ecommerce' },
        { label: 'Reviews' },
      ]} />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[1.4fr_0.6fr_2fr_1fr_1fr_0.8fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Customer</span>
          <span>Rating</span>
          <span>Comment</span>
          <span>Date</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Star className="h-8 w-8" />} title="No reviews" />
        ) : (
          <div className="divide-y">
            {items.map((r) => (
              <div key={r.id as string} className="grid grid-cols-[1.4fr_0.6fr_2fr_1fr_1fr_0.8fr] gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{(r.customerName as string) ?? '-'}</span>
                <span>{'★'.repeat(Number(r.rating ?? 0))}</span>
                <span className="truncate text-muted-foreground">{(r.body as string) ?? (r.title as string) ?? ''}</span>
                <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>
                <StatusBadge label={r.isPublished ? 'Published' : 'Pending'} variant={r.isPublished ? 'success' : 'default'} />
                {r.isPublished ? (
                  <button onClick={() => unpublish.mutate({ reviewId: r.id as string })} className="text-xs text-primary">Unpublish</button>
                ) : (
                  <button onClick={() => publish.mutate({ reviewId: r.id as string })} className="text-xs text-primary">Publish</button>
                )}
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
