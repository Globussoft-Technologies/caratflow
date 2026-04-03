'use client';

import { useState } from 'react';
import { PageHeader, DataTable, StatusBadge, getStatusVariant, StatCard } from '@caratflow/ui';
import { Umbrella, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import type { ColumnDef } from '@caratflow/ui';

const coverageTypeLabels: Record<string, string> = {
  ALL_RISK: 'All Risk',
  TRANSIT: 'Transit',
  STORAGE: 'Storage',
  DISPLAY: 'Display',
};

export default function InsurancePoliciesPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = trpc.compliance.insurance.list.useQuery({
    page,
    limit: 20,
    sortOrder: 'desc',
  });

  const { data: summary } = trpc.compliance.insurance.coverageSummary.useQuery();

  const columns: ColumnDef<Record<string, unknown>, unknown>[] = [
    {
      accessorKey: 'policyNumber',
      header: 'Policy #',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.policyNumber as string}</span>
      ),
    },
    {
      accessorKey: 'provider',
      header: 'Provider',
    },
    {
      accessorKey: 'coverageType',
      header: 'Coverage',
      cell: ({ row }) =>
        coverageTypeLabels[row.original.coverageType as string] ?? row.original.coverageType,
    },
    {
      accessorKey: 'coveredValuePaise',
      header: 'Covered Value',
      cell: ({ row }) =>
        (Number(row.original.coveredValuePaise) / 100).toLocaleString('en-IN', {
          style: 'currency', currency: 'INR', maximumFractionDigits: 0,
        }),
    },
    {
      accessorKey: 'premiumPaise',
      header: 'Premium',
      cell: ({ row }) =>
        (Number(row.original.premiumPaise) / 100).toLocaleString('en-IN', {
          style: 'currency', currency: 'INR', maximumFractionDigits: 0,
        }),
    },
    {
      accessorKey: 'startDate',
      header: 'Start',
      cell: ({ row }) => new Date(row.original.startDate as string).toLocaleDateString(),
    },
    {
      accessorKey: 'endDate',
      header: 'End',
      cell: ({ row }) => {
        const end = new Date(row.original.endDate as string);
        const isExpiring = end.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
        return (
          <span className={isExpiring && row.original.status === 'ACTIVE' ? 'text-amber-600 font-medium' : ''}>
            {end.toLocaleDateString()}
          </span>
        );
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance Policies"
        description="Track insurance coverage for jewelry inventory and transit."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Insurance' },
        ]}
      />

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Active Policies"
          value={summary?.activePolicies?.toString() ?? '0'}
          icon={<Umbrella className="h-5 w-5" />}
        />
        <StatCard
          title="Total Coverage"
          value={
            summary?.totalCoveredPaise
              ? (summary.totalCoveredPaise / 100).toLocaleString('en-IN', {
                  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
                })
              : '---'
          }
          icon={<Umbrella className="h-5 w-5" />}
        />
        <StatCard
          title="Total Premium"
          value={
            summary?.totalPremiumPaise
              ? (summary.totalPremiumPaise / 100).toLocaleString('en-IN', {
                  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
                })
              : '---'
          }
          icon={<Umbrella className="h-5 w-5" />}
        />
      </div>

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
