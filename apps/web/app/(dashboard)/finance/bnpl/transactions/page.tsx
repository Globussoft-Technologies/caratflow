'use client';

import * as React from 'react';
import { PageHeader, StatusBadge, DataTable, type ColumnDef } from '@caratflow/ui';
import { Download, Filter } from 'lucide-react';

interface TransactionRow {
  id: string;
  orderId: string;
  customerName: string;
  providerName: string;
  orderAmountPaise: number;
  emiAmountPaise: number;
  tenure: number;
  interestPaise: number;
  totalPayablePaise: number;
  status: string;
  nextDueDate: string | null;
  paidInstallments: number;
  createdAt: string;
}

const mockTransactions: TransactionRow[] = [
  {
    id: '1',
    orderId: 'ORD-202604-0042',
    customerName: 'Priya Sharma',
    providerName: 'BAJAJ_FINSERV',
    orderAmountPaise: 250000_00,
    emiAmountPaise: 22500_00,
    tenure: 12,
    interestPaise: 20000_00,
    totalPayablePaise: 270000_00,
    status: 'ACTIVE',
    nextDueDate: '2026-05-01',
    paidInstallments: 2,
    createdAt: '2026-02-15',
  },
  {
    id: '2',
    orderId: 'ORD-202604-0039',
    customerName: 'Amit Patel',
    providerName: 'HDFC_FLEXIPAY',
    orderAmountPaise: 180000_00,
    emiAmountPaise: 31200_00,
    tenure: 6,
    interestPaise: 7200_00,
    totalPayablePaise: 187200_00,
    status: 'ACTIVE',
    nextDueDate: '2026-04-15',
    paidInstallments: 1,
    createdAt: '2026-03-10',
  },
  {
    id: '3',
    orderId: 'ORD-202604-0035',
    customerName: 'Sunita Jain',
    providerName: 'SIMPL',
    orderAmountPaise: 75000_00,
    emiAmountPaise: 25500_00,
    tenure: 3,
    interestPaise: 1500_00,
    totalPayablePaise: 76500_00,
    status: 'APPROVED',
    nextDueDate: '2026-04-20',
    paidInstallments: 0,
    createdAt: '2026-04-05',
  },
  {
    id: '4',
    orderId: 'ORD-202603-0128',
    customerName: 'Rajesh Kumar',
    providerName: 'LAZYPAY',
    orderAmountPaise: 50000_00,
    emiAmountPaise: 17200_00,
    tenure: 3,
    interestPaise: 1600_00,
    totalPayablePaise: 51600_00,
    status: 'DEFAULTED',
    nextDueDate: '2026-03-15',
    paidInstallments: 1,
    createdAt: '2026-01-10',
  },
  {
    id: '5',
    orderId: 'ORD-202603-0095',
    customerName: 'Meena Agarwal',
    providerName: 'BAJAJ_FINSERV',
    orderAmountPaise: 320000_00,
    emiAmountPaise: 55000_00,
    tenure: 6,
    interestPaise: 10000_00,
    totalPayablePaise: 330000_00,
    status: 'COMPLETED',
    nextDueDate: null,
    paidInstallments: 6,
    createdAt: '2025-10-05',
  },
  {
    id: '6',
    orderId: 'ORD-202604-0048',
    customerName: 'Vikram Singh',
    providerName: 'HDFC_FLEXIPAY',
    orderAmountPaise: 120000_00,
    emiAmountPaise: 41000_00,
    tenure: 3,
    interestPaise: 3000_00,
    totalPayablePaise: 123000_00,
    status: 'INITIATED',
    nextDueDate: null,
    paidInstallments: 0,
    createdAt: '2026-04-07',
  },
];

const providerLabels: Record<string, string> = {
  SIMPL: 'Simpl',
  LAZYPAY: 'LazyPay',
  ZESTMONEY: 'ZestMoney',
  BAJAJ_FINSERV: 'Bajaj Finserv',
  HDFC_FLEXIPAY: 'HDFC FlexiPay',
  CUSTOM: 'Custom',
};

function formatCurrency(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

const columns: ColumnDef<TransactionRow, unknown>[] = [
  {
    accessorKey: 'orderId',
    header: 'Order',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.orderId}</span>
    ),
  },
  {
    accessorKey: 'customerName',
    header: 'Customer',
  },
  {
    accessorKey: 'providerName',
    header: 'Provider',
    cell: ({ row }) => (
      <span className="text-sm">{providerLabels[row.original.providerName] ?? row.original.providerName}</span>
    ),
  },
  {
    accessorKey: 'orderAmountPaise',
    header: 'Order Amount',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCurrency(row.original.orderAmountPaise)}</span>
    ),
  },
  {
    accessorKey: 'emiAmountPaise',
    header: 'EMI/month',
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">{formatCurrency(row.original.emiAmountPaise)}</span>
    ),
  },
  {
    accessorKey: 'tenure',
    header: 'Progress',
    cell: ({ row }) => {
      const paid = row.original.paidInstallments;
      const total = row.original.tenure;
      const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{paid}/{total}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'totalPayablePaise',
    header: 'Total Payable',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCurrency(row.original.totalPayablePaise)}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge status={row.original.status} />
    ),
  },
  {
    accessorKey: 'nextDueDate',
    header: 'Next Due',
    cell: ({ row }) => {
      if (!row.original.nextDueDate) {
        return <span className="text-muted-foreground">-</span>;
      }
      const isOverdue = new Date(row.original.nextDueDate) < new Date();
      return (
        <span className={isOverdue ? 'font-medium text-red-600' : 'text-muted-foreground'}>
          {row.original.nextDueDate}
        </span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.createdAt}</span>
    ),
  },
];

export default function BnplTransactionsPage() {
  const [statusFilter, setStatusFilter] = React.useState<string>('');
  const [providerFilter, setProviderFilter] = React.useState<string>('');

  const filteredData = mockTransactions.filter((tx) => {
    if (statusFilter && tx.status !== statusFilter) return false;
    if (providerFilter && tx.providerName !== providerFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="BNPL Transactions"
        description="View and manage all Buy Now Pay Later and EMI transactions."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'BNPL & EMI', href: '/finance/bnpl' },
          { label: 'Transactions' },
        ]}
        actions={
          <button className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
            <Download className="h-4 w-4" /> Export
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="INITIATED">Initiated</option>
          <option value="APPROVED">Approved</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="DEFAULTED">Defaulted</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="">All Providers</option>
          <option value="SIMPL">Simpl</option>
          <option value="LAZYPAY">LazyPay</option>
          <option value="ZESTMONEY">ZestMoney</option>
          <option value="BAJAJ_FINSERV">Bajaj Finserv</option>
          <option value="HDFC_FLEXIPAY">HDFC FlexiPay</option>
        </select>
        {(statusFilter || providerFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setProviderFilter(''); }}
            className="text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', count: mockTransactions.length, color: '' },
          { label: 'Active', count: mockTransactions.filter((t) => t.status === 'ACTIVE').length, color: 'text-blue-600' },
          { label: 'Completed', count: mockTransactions.filter((t) => t.status === 'COMPLETED').length, color: 'text-emerald-600' },
          { label: 'Defaulted', count: mockTransactions.filter((t) => t.status === 'DEFAULTED').length, color: 'text-red-600' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card px-4 py-3">
            <span className="text-xs text-muted-foreground">{stat.label}</span>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        searchKey="orderId"
        searchPlaceholder="Search by order ID..."
      />
    </div>
  );
}
