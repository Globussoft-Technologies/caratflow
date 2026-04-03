'use client';

import { PageHeader, DataTable, StatusBadge, getStatusVariant, type ColumnDef } from '@caratflow/ui';
import { Plus } from 'lucide-react';

interface CustomOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  description: string;
  status: string;
  estimatePaise: number | null;
  depositPaise: number;
  expectedDate: string | null;
  createdAt: string;
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

const columns: ColumnDef<CustomOrderRow, unknown>[] = [
  { accessorKey: 'orderNumber', header: 'Order #', cell: ({ row }) => (
    <span className="font-mono text-sm">{row.original.orderNumber}</span>
  )},
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'description', header: 'Description', cell: ({ row }) => (
    <span className="max-w-xs truncate block">{row.original.description}</span>
  )},
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
    <StatusBadge label={row.original.status.replace('_', ' ')} variant={getStatusVariant(row.original.status)} />
  )},
  { accessorKey: 'estimatePaise', header: 'Estimate', cell: ({ row }) => (
    <span>{row.original.estimatePaise ? formatPaise(row.original.estimatePaise) : '-'}</span>
  )},
  { accessorKey: 'depositPaise', header: 'Deposit', cell: ({ row }) => (
    <span>{formatPaise(row.original.depositPaise)}</span>
  )},
  { accessorKey: 'expectedDate', header: 'Expected', cell: ({ row }) => (
    <span>{row.original.expectedDate ? new Date(row.original.expectedDate).toLocaleDateString('en-IN') : '-'}</span>
  )},
];

const mockOrders: CustomOrderRow[] = [
  { id: '1', orderNumber: 'CO/MUM/2604/0003', customerName: 'Kavita Reddy', description: 'Custom engagement ring - 2ct solitaire in 18K white gold', status: 'IN_PRODUCTION', estimatePaise: 35000000, depositPaise: 17500000, expectedDate: '2026-04-15', createdAt: new Date().toISOString() },
  { id: '2', orderNumber: 'CO/MUM/2604/0002', customerName: 'Amit Joshi', description: 'Bespoke 22K gold necklace set for wedding', status: 'DESIGNED', estimatePaise: 85000000, depositPaise: 0, expectedDate: '2026-05-01', createdAt: new Date().toISOString() },
  { id: '3', orderNumber: 'CO/MUM/2604/0001', customerName: 'Sunita Gupta', description: 'Silver anklet pair with custom jingle bells', status: 'DELIVERED', estimatePaise: 1500000, depositPaise: 1500000, expectedDate: '2026-03-20', createdAt: new Date().toISOString() },
];

export default function CustomOrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom Orders"
        description="Manage bespoke and custom jewelry orders."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Retail', href: '/retail' },
          { label: 'Custom Orders' },
        ]}
        actions={
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Order
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={mockOrders}
        searchKey="customerName"
        searchPlaceholder="Search by customer..."
        onRowClick={(row) => { window.location.href = `/retail/custom-orders/${row.id}`; }}
      />
    </div>
  );
}
