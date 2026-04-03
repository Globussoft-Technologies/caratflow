'use client';

import { useState } from 'react';
import { PageHeader, DataTable, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { ClipboardList } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import type { ColumnDef } from '@caratflow/ui';

const auditTypeLabels: Record<string, string> = {
  INTERNAL: 'Internal',
  BIS: 'BIS',
  CUSTOMS: 'Customs',
  TAX: 'Tax',
};

export default function ComplianceAuditsPage() {
  const [page, setPage] = useState(1);
  const [auditType, setAuditType] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const { data, isLoading } = trpc.compliance.audits.list.useQuery({
    page,
    limit: 20,
    sortBy: 'auditDate',
    sortOrder: 'desc',
    auditType: auditType || undefined,
    status: status || undefined,
  } as Record<string, unknown>);

  const columns: ColumnDef<Record<string, unknown>, unknown>[] = [
    {
      accessorKey: 'auditType',
      header: 'Type',
      cell: ({ row }) => (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
          {auditTypeLabels[row.original.auditType as string] ?? row.original.auditType}
        </span>
      ),
    },
    {
      accessorKey: 'auditDate',
      header: 'Date',
      cell: ({ row }) => new Date(row.original.auditDate as string).toLocaleDateString(),
    },
    {
      accessorKey: 'auditorName',
      header: 'Auditor',
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
      accessorKey: 'findings',
      header: 'Findings',
      cell: ({ row }) => {
        const findings = row.original.findings as string | null;
        if (!findings) return '-';
        return (
          <span className="text-xs text-muted-foreground max-w-[200px] truncate block">
            {findings}
          </span>
        );
      },
    },
    {
      accessorKey: 'resolvedAt',
      header: 'Resolved',
      cell: ({ row }) =>
        row.original.resolvedAt
          ? new Date(row.original.resolvedAt as string).toLocaleDateString()
          : '-',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Audits"
        description="Schedule audits, record findings, and track resolution."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Audits' },
        ]}
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={auditType}
          onChange={(e) => { setAuditType(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {Object.entries(auditTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="FINDINGS_OPEN">Findings Open</option>
          <option value="RESOLVED">Resolved</option>
        </select>
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
