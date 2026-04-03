'use client';

import * as React from 'react';
import { PageHeader, DataTable, StatusBadge, getStatusVariant, type ColumnDef } from '@caratflow/ui';
import { Receipt, Search } from 'lucide-react';

interface SaleRow {
  id: string;
  saleNumber: string;
  customerName: string | null;
  locationName: string;
  status: string;
  totalPaise: number;
  paymentMethods: string;
  createdAt: string;
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

const columns: ColumnDef<SaleRow, unknown>[] = [
  { accessorKey: 'saleNumber', header: 'Sale #', cell: ({ row }) => (
    <span className="font-mono text-sm">{row.original.saleNumber}</span>
  )},
  { accessorKey: 'customerName', header: 'Customer', cell: ({ row }) => (
    <span>{row.original.customerName ?? 'Walk-in'}</span>
  )},
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
    <StatusBadge label={row.original.status.replace('_', ' ')} variant={getStatusVariant(row.original.status)} />
  )},
  { accessorKey: 'totalPaise', header: 'Total', cell: ({ row }) => (
    <span className="font-medium">{formatPaise(row.original.totalPaise)}</span>
  )},
  { accessorKey: 'paymentMethods', header: 'Payment' },
  { accessorKey: 'createdAt', header: 'Date', cell: ({ row }) => (
    <span>{new Date(row.original.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
  )},
];

// Mock data
const mockSales: SaleRow[] = [
  { id: '1', saleNumber: 'SL/MUM/2604/0012', customerName: 'Priya Sharma', locationName: 'Mumbai', status: 'COMPLETED', totalPaise: 85000_00, paymentMethods: 'CASH, CARD', createdAt: new Date().toISOString() },
  { id: '2', saleNumber: 'SL/MUM/2604/0011', customerName: 'Rahul Patel', locationName: 'Mumbai', status: 'COMPLETED', totalPaise: 125000_00, paymentMethods: 'UPI', createdAt: new Date().toISOString() },
  { id: '3', saleNumber: 'SL/MUM/2604/0010', customerName: null, locationName: 'Mumbai', status: 'VOIDED', totalPaise: 45000_00, paymentMethods: 'CASH', createdAt: new Date().toISOString() },
  { id: '4', saleNumber: 'SL/MUM/2604/0009', customerName: 'Anita Desai', locationName: 'Mumbai', status: 'PARTIALLY_RETURNED', totalPaise: 230000_00, paymentMethods: 'CARD, OLD_GOLD', createdAt: new Date().toISOString() },
];

export default function SalesListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales History"
        description="View and manage all sales transactions."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Retail', href: '/retail' },
          { label: 'Sales' },
        ]}
        actions={
          <a
            href="/retail/pos"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Receipt className="h-4 w-4" />
            New Sale
          </a>
        }
      />

      <DataTable
        columns={columns}
        data={mockSales}
        searchKey="saleNumber"
        searchPlaceholder="Search by sale number..."
        onRowClick={(row) => { window.location.href = `/retail/sales/${row.id}`; }}
      />
    </div>
  );
}
