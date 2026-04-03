'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, getStatusVariant, DataTable } from '@caratflow/ui';
import { Shield } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { HallmarkStatusTracker, HuidBadge } from '@/features/compliance';
import type { ColumnDef } from '@caratflow/ui';

export default function HallmarkSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: submission, isLoading } = trpc.compliance.hallmark.submissions.getById.useQuery({ id });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Submission Detail" breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Hallmark', href: '/compliance/hallmark' },
          { label: 'Loading...' },
        ]} />
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-lg bg-muted" />
          <div className="h-64 rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="space-y-6">
        <PageHeader title="Submission Not Found" />
        <p className="text-muted-foreground">The requested submission could not be found.</p>
      </div>
    );
  }

  const center = submission.hallmarkCenter as { name: string; centerCode: string } | undefined;

  const itemColumns: ColumnDef<Record<string, unknown>, unknown>[] = [
    {
      accessorKey: 'product.sku',
      header: 'SKU',
      cell: ({ row }) => {
        const product = row.original.product as { sku: string } | undefined;
        return product?.sku ?? '-';
      },
    },
    {
      accessorKey: 'product.name',
      header: 'Product',
      cell: ({ row }) => {
        const product = row.original.product as { name: string } | undefined;
        return product?.name ?? '-';
      },
    },
    {
      accessorKey: 'declaredPurity',
      header: 'Declared Purity',
    },
    {
      accessorKey: 'testedPurity',
      header: 'Tested Purity',
      cell: ({ row }) => (row.original.testedPurity as number) ?? '-',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge
          label={row.original.status as string}
          variant={getStatusVariant(row.original.status as string)}
        />
      ),
    },
    {
      accessorKey: 'huidAssigned',
      header: 'HUID',
      cell: ({ row }) => (
        <HuidBadge huidNumber={row.original.huidAssigned as string | null} />
      ),
    },
    {
      accessorKey: 'failureReason',
      header: 'Failure Reason',
      cell: ({ row }) => (row.original.failureReason as string) ?? '-',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Submission: ${submission.submissionNumber}`}
        description={center ? `${center.name} (${center.centerCode})` : undefined}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Hallmark', href: '/compliance/hallmark' },
          { label: submission.submissionNumber as string },
        ]}
      />

      {/* Status Tracker */}
      <div className="rounded-lg border p-4">
        <HallmarkStatusTracker
          status={submission.status as string}
          totalItems={submission.totalItems as number}
          passedItems={submission.passedItems as number}
          failedItems={submission.failedItems as number}
        />
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">Submitted</div>
          <div className="text-sm font-medium">
            {new Date(submission.submittedDate as string).toLocaleDateString()}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">Expected Return</div>
          <div className="text-sm font-medium">
            {submission.expectedReturnDate
              ? new Date(submission.expectedReturnDate as string).toLocaleDateString()
              : '-'}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">Actual Return</div>
          <div className="text-sm font-medium">
            {submission.actualReturnDate
              ? new Date(submission.actualReturnDate as string).toLocaleDateString()
              : '-'}
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">Status</div>
          <StatusBadge
            label={submission.status as string}
            variant={getStatusVariant(submission.status as string)}
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Submission Items</h3>
        <DataTable
          columns={itemColumns}
          data={(submission.items as Record<string, unknown>[]) ?? []}
          isLoading={false}
          pageSize={50}
        />
      </div>

      {/* Notes */}
      {submission.notes && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-2">Notes</h3>
          <p className="text-sm text-muted-foreground">{submission.notes as string}</p>
        </div>
      )}
    </div>
  );
}
