'use client';

import * as React from 'react';
import { PageHeader, DataTable, StatusBadge, getStatusVariant, type ColumnDef } from '@caratflow/ui';
import { RotateCcw } from 'lucide-react';

interface ReturnRow {
  id: string;
  returnNumber: string;
  originalSaleNumber: string;
  customerName: string | null;
  status: string;
  refundAmountPaise: number;
  metalRateDifferencePaise: number;
  createdAt: string;
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

const columns: ColumnDef<ReturnRow, unknown>[] = [
  { accessorKey: 'returnNumber', header: 'Return #', cell: ({ row }) => (
    <span className="font-mono text-sm">{row.original.returnNumber}</span>
  )},
  { accessorKey: 'originalSaleNumber', header: 'Original Sale' },
  { accessorKey: 'customerName', header: 'Customer', cell: ({ row }) => (
    <span>{row.original.customerName ?? 'Walk-in'}</span>
  )},
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
    <StatusBadge label={row.original.status} variant={getStatusVariant(row.original.status)} />
  )},
  { accessorKey: 'refundAmountPaise', header: 'Refund', cell: ({ row }) => (
    <span className="font-medium">{formatPaise(row.original.refundAmountPaise)}</span>
  )},
  { accessorKey: 'metalRateDifferencePaise', header: 'Rate Diff', cell: ({ row }) => {
    const diff = row.original.metalRateDifferencePaise;
    if (diff === 0) return <span className="text-muted-foreground">-</span>;
    return (
      <span className={diff > 0 ? 'text-emerald-600' : 'text-red-600'}>
        {diff > 0 ? '+' : ''}{formatPaise(diff)}
      </span>
    );
  }},
  { accessorKey: 'createdAt', header: 'Date', cell: ({ row }) => (
    <span>{new Date(row.original.createdAt).toLocaleDateString('en-IN')}</span>
  )},
];

const mockReturns: ReturnRow[] = [
  { id: '1', returnNumber: 'RT/MUM/2604/0002', originalSaleNumber: 'SL/MUM/2604/0009', customerName: 'Anita Desai', status: 'DRAFT', refundAmountPaise: 85000_00, metalRateDifferencePaise: 2500_00, createdAt: new Date().toISOString() },
  { id: '2', returnNumber: 'RT/MUM/2604/0001', originalSaleNumber: 'SL/MUM/2604/0005', customerName: 'Vijay Singh', status: 'COMPLETED', refundAmountPaise: 45000_00, metalRateDifferencePaise: -1200_00, createdAt: new Date().toISOString() },
];

export default function ReturnsListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sale Returns"
        description="Manage return transactions and refunds."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Retail', href: '/retail' },
          { label: 'Returns' },
        ]}
        actions={
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RotateCcw className="h-4 w-4" />
            New Return
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={mockReturns}
        searchKey="returnNumber"
        searchPlaceholder="Search by return number..."
        onRowClick={(row) => { window.location.href = `/retail/returns/${row.id}`; }}
      />
    </div>
  );
}
