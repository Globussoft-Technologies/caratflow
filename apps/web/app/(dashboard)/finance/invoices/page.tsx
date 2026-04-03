'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, StatusBadge, DataTable, type ColumnDef } from '@caratflow/ui';
import { Plus, FileText } from 'lucide-react';
import Link from 'next/link';

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  date: string;
  partyName: string;
  totalPaise: number;
  paidPaise: number;
  status: string;
}

const mockInvoices: InvoiceRow[] = [
  { id: '1', invoiceNumber: 'INV-202604-0012', invoiceType: 'SALES', date: '2026-04-03', partyName: 'Priya Sharma', totalPaise: 190550_00, paidPaise: 190550_00, status: 'PAID' },
  { id: '2', invoiceNumber: 'INV-202604-0011', invoiceType: 'SALES', date: '2026-04-02', partyName: 'Amit Patel', totalPaise: 97850_00, paidPaise: 50000_00, status: 'PARTIALLY_PAID' },
  { id: '3', invoiceNumber: 'PINV-202604-0005', invoiceType: 'PURCHASE', date: '2026-04-01', partyName: 'Rajesh Gold Suppliers', totalPaise: 463500_00, paidPaise: 0, status: 'SENT' },
  { id: '4', invoiceNumber: 'INV-202603-0089', invoiceType: 'SALES', date: '2026-03-28', partyName: 'Sunita Reddy', totalPaise: 45000_00, paidPaise: 0, status: 'OVERDUE' },
  { id: '5', invoiceNumber: 'CN-202604-0001', invoiceType: 'CREDIT_NOTE', date: '2026-04-01', partyName: 'Walk-in Customer', totalPaise: 12000_00, paidPaise: 12000_00, status: 'PAID' },
];

const columns: ColumnDef<InvoiceRow, unknown>[] = [
  { accessorKey: 'invoiceNumber', header: 'Invoice #', cell: ({ row }) => (
    <Link href={`/finance/invoices/${row.original.id}`} className="font-mono text-sm text-primary hover:underline">
      {row.original.invoiceNumber}
    </Link>
  )},
  { accessorKey: 'invoiceType', header: 'Type', cell: ({ row }) => {
    const labels: Record<string, string> = { SALES: 'Sales', PURCHASE: 'Purchase', CREDIT_NOTE: 'Credit Note', DEBIT_NOTE: 'Debit Note' };
    return <span className="text-sm">{labels[row.original.invoiceType] ?? row.original.invoiceType}</span>;
  }},
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'partyName', header: 'Party' },
  { accessorKey: 'totalPaise', header: 'Total', cell: ({ row }) => (
    <span className="font-mono">{(row.original.totalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
  )},
  { accessorKey: 'paidPaise', header: 'Paid', cell: ({ row }) => (
    <span className="font-mono text-emerald-600">{(row.original.paidPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
  )},
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
    <StatusBadge status={row.original.status} />
  )},
];

export default function InvoicesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<'ALL' | 'SALES' | 'PURCHASE'>('ALL');

  const filteredInvoices = activeTab === 'ALL'
    ? mockInvoices
    : mockInvoices.filter((inv) => inv.invoiceType === activeTab);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Sales invoices, purchase invoices, and credit/debit notes."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Invoices' },
        ]}
        actions={
          <Link
            href="/finance/invoices/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New Invoice
          </Link>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {(['ALL', 'SALES', 'PURCHASE'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'ALL' ? 'All' : tab === 'SALES' ? 'Sales' : 'Purchase'}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredInvoices}
        searchKey="invoiceNumber"
        searchPlaceholder="Search invoices..."
        onRowClick={(row) => router.push(`/finance/invoices/${row.id}`)}
      />
    </div>
  );
}
