'use client';

import { useState } from 'react';
import { PageHeader, DataTable, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Shield, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { HallmarkStatusTracker } from '@/features/compliance';
import type { ColumnDef } from '@caratflow/ui';

export default function HallmarkSubmissionsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.compliance.hallmark.submissions.list.useQuery({
    page,
    limit: 20,
    sortBy: 'submittedDate',
    sortOrder: 'desc',
  });

  const columns: ColumnDef<Record<string, unknown>, unknown>[] = [
    {
      accessorKey: 'submissionNumber',
      header: 'Submission #',
      cell: ({ row }) => (
        <Link
          href={`/compliance/hallmark/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.submissionNumber as string}
        </Link>
      ),
    },
    {
      accessorKey: 'hallmarkCenter.name',
      header: 'Center',
      cell: ({ row }) => {
        const center = row.original.hallmarkCenter as { name: string } | undefined;
        return center?.name ?? '-';
      },
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
      accessorKey: 'totalItems',
      header: 'Items',
    },
    {
      accessorKey: 'passedItems',
      header: 'Passed',
      cell: ({ row }) => (
        <span className="text-emerald-600 font-medium">{row.original.passedItems as number}</span>
      ),
    },
    {
      accessorKey: 'failedItems',
      header: 'Failed',
      cell: ({ row }) => (
        <span className="text-red-600 font-medium">{row.original.failedItems as number}</span>
      ),
    },
    {
      accessorKey: 'submittedDate',
      header: 'Submitted',
      cell: ({ row }) => new Date(row.original.submittedDate as string).toLocaleDateString(),
    },
    {
      accessorKey: 'expectedReturnDate',
      header: 'Expected Return',
      cell: ({ row }) =>
        row.original.expectedReturnDate
          ? new Date(row.original.expectedReturnDate as string).toLocaleDateString()
          : '-',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hallmark Submissions"
        description="Track hallmark testing submissions to BIS-authorized centers."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Hallmark Submissions' },
        ]}
        actions={
          <Link
            href="/compliance/hallmark/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Submission
          </Link>
        }
      />

      <DataTable
        columns={columns}
        data={(data?.items as Record<string, unknown>[]) ?? []}
        isLoading={isLoading}
        pageSize={20}
      />

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data.hasPrevious}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.hasNext}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
