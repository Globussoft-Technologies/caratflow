'use client';

import { useState } from 'react';
import { PageHeader, DataTable, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { FileText, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { ExpiryAlert } from '@/features/compliance';
import type { ColumnDef } from '@caratflow/ui';

const docTypeLabels: Record<string, string> = {
  KIMBERLEY_CERTIFICATE: 'Kimberley Certificate',
  CONFLICT_FREE_DECLARATION: 'Conflict-Free Declaration',
  CERTIFICATE_OF_ORIGIN: 'Certificate of Origin',
  IMPORT_LICENSE: 'Import License',
  EXPORT_LICENSE: 'Export License',
  BIS_CERTIFICATE: 'BIS Certificate',
  INSURANCE_POLICY: 'Insurance Policy',
  ASSAY_REPORT: 'Assay Report',
};

export default function ComplianceDocumentsPage() {
  const [page, setPage] = useState(1);
  const [docType, setDocType] = useState<string>('');

  const { data, isLoading } = trpc.compliance.documents.list.useQuery({
    page,
    limit: 20,
    sortOrder: 'desc',
    documentType: docType || undefined,
  } as Record<string, unknown>);

  const columns: ColumnDef<Record<string, unknown>, unknown>[] = [
    {
      accessorKey: 'documentNumber',
      header: 'Document #',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.documentNumber as string}</span>
      ),
    },
    {
      accessorKey: 'documentType',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-xs">
          {docTypeLabels[row.original.documentType as string] ?? row.original.documentType}
        </span>
      ),
    },
    {
      accessorKey: 'issuedBy',
      header: 'Issued By',
      cell: ({ row }) => (row.original.issuedBy as string) ?? '-',
    },
    {
      accessorKey: 'issuedDate',
      header: 'Issued',
      cell: ({ row }) =>
        row.original.issuedDate
          ? new Date(row.original.issuedDate as string).toLocaleDateString()
          : '-',
    },
    {
      accessorKey: 'expiryDate',
      header: 'Expiry',
      cell: ({ row }) => {
        if (!row.original.expiryDate) return '-';
        const expiry = new Date(row.original.expiryDate as string);
        const isExpiring = expiry.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
        return (
          <span className={isExpiring ? 'text-amber-600 font-medium' : ''}>
            {expiry.toLocaleDateString()}
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
    {
      accessorKey: 'fileUrl',
      header: 'File',
      cell: ({ row }) =>
        row.original.fileUrl ? (
          <a
            href={row.original.fileUrl as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-xs hover:underline"
          >
            View
          </a>
        ) : '-',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Documents"
        description="Kimberley Process certificates, import/export licenses, and regulatory documents."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Documents' },
        ]}
      />

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={docType}
          onChange={(e) => { setDocType(e.target.value); setPage(1); }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {Object.entries(docTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
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
