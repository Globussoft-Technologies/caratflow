'use client';

import { PageHeader, DataTable, StatusBadge, getStatusVariant } from '@caratflow/ui';
import type { ColumnDef } from '@caratflow/ui';
import { Star, MessageSquare } from 'lucide-react';

interface FeedbackRow {
  id: string;
  customerName: string;
  feedbackType: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: Date;
}

const feedbackData: FeedbackRow[] = [
  { id: '1', customerName: 'Priya Sharma', feedbackType: 'PURCHASE', rating: 5, comment: 'Excellent service and beautiful jewelry!', status: 'REVIEWED', createdAt: new Date(Date.now() - 86400000) },
  { id: '2', customerName: 'Rahul Mehta', feedbackType: 'SERVICE', rating: 4, comment: 'Good cleaning service for old jewelry.', status: 'NEW', createdAt: new Date(Date.now() - 2 * 86400000) },
  { id: '3', customerName: 'Anita Desai', feedbackType: 'REPAIR', rating: 3, comment: 'Repair took longer than expected, but quality was good.', status: 'ACTIONED', createdAt: new Date(Date.now() - 5 * 86400000) },
  { id: '4', customerName: 'Vikram Singh', feedbackType: 'PURCHASE', rating: 5, comment: 'Amazing collection! Very helpful staff.', status: 'REVIEWED', createdAt: new Date(Date.now() - 7 * 86400000) },
  { id: '5', customerName: 'Meena Patel', feedbackType: 'GENERAL', rating: 2, comment: 'Long wait time during peak hours.', status: 'NEW', createdAt: new Date(Date.now() - 10 * 86400000) },
];

function StarsCell({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

const columns: ColumnDef<FeedbackRow>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ getValue }) => (getValue() as Date).toLocaleDateString('en-IN'),
  },
  { accessorKey: 'customerName', header: 'Customer' },
  {
    accessorKey: 'feedbackType',
    header: 'Type',
    cell: ({ getValue }) => <StatusBadge label={getValue() as string} variant="muted" dot={false} />,
  },
  {
    accessorKey: 'rating',
    header: 'Rating',
    cell: ({ getValue }) => <StarsCell rating={getValue() as number} />,
  },
  {
    accessorKey: 'comment',
    header: 'Comment',
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground line-clamp-1">
        {(getValue() as string) ?? '-'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const s = getValue() as string;
      const v: Record<string, 'default' | 'success' | 'warning'> = { NEW: 'default', REVIEWED: 'warning', ACTIONED: 'success' };
      return <StatusBadge label={s} variant={v[s] ?? 'default'} />;
    },
  },
];

// Rating summary
const avgRating = feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length;
const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
feedbackData.forEach((f) => { distribution[f.rating]!++; });

export default function FeedbackPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Feedback"
        description="View and manage customer feedback and ratings."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Feedback' },
        ]}
      />

      {/* Rating Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Average Rating</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{avgRating.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">/ 5</span>
          </div>
          <StarsCell rating={Math.round(avgRating)} />
          <p className="mt-1 text-xs text-muted-foreground">{feedbackData.length} total reviews</p>
        </div>

        <div className="rounded-lg border bg-card p-6 sm:col-span-1 lg:col-span-2">
          <h3 className="text-sm font-medium text-muted-foreground">Rating Distribution</h3>
          <div className="mt-3 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = distribution[rating] ?? 0;
              const pct = feedbackData.length > 0 ? (count / feedbackData.length) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-2">
                  <span className="w-6 text-right text-sm">{rating}</span>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <div className="flex-1 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-amber-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={feedbackData}
        searchKey="customerName"
        searchPlaceholder="Search by customer..."
      />
    </div>
  );
}
