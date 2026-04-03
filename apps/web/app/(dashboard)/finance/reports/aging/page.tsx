'use client';

import * as React from 'react';
import { PageHeader, DataTable, type ColumnDef } from '@caratflow/ui';

interface AgingEntry {
  invoiceNumber: string;
  partyName: string;
  invoiceDate: string;
  dueDate: string;
  totalPaise: number;
  paidPaise: number;
  outstandingPaise: number;
  ageDays: number;
}

const mockArAging: AgingEntry[] = [
  { invoiceNumber: 'INV-202604-0011', partyName: 'Amit Patel', invoiceDate: '2026-04-02', dueDate: '2026-05-02', totalPaise: 97850_00, paidPaise: 50000_00, outstandingPaise: 47850_00, ageDays: 2 },
  { invoiceNumber: 'INV-202603-0089', partyName: 'Sunita Reddy', invoiceDate: '2026-03-28', dueDate: '2026-04-27', totalPaise: 45000_00, paidPaise: 0, outstandingPaise: 45000_00, ageDays: 7 },
  { invoiceNumber: 'INV-202603-0072', partyName: 'Deepak Jain', invoiceDate: '2026-03-15', dueDate: '2026-04-14', totalPaise: 250000_00, paidPaise: 100000_00, outstandingPaise: 150000_00, ageDays: 20 },
  { invoiceNumber: 'INV-202602-0055', partyName: 'Meena Agarwal', invoiceDate: '2026-02-10', dueDate: '2026-03-12', totalPaise: 180000_00, paidPaise: 0, outstandingPaise: 180000_00, ageDays: 53 },
];

const mockApAging: AgingEntry[] = [
  { invoiceNumber: 'PINV-202604-0005', partyName: 'Rajesh Gold Suppliers', invoiceDate: '2026-04-01', dueDate: '2026-05-01', totalPaise: 463500_00, paidPaise: 200000_00, outstandingPaise: 263500_00, ageDays: 3 },
  { invoiceNumber: 'PINV-202603-0012', partyName: 'Diamond World Exports', invoiceDate: '2026-03-20', dueDate: '2026-04-19', totalPaise: 120000_00, paidPaise: 0, outstandingPaise: 120000_00, ageDays: 15 },
];

const columns: ColumnDef<AgingEntry, unknown>[] = [
  { accessorKey: 'invoiceNumber', header: 'Invoice #', cell: ({ row }) => (
    <span className="font-mono text-sm">{row.original.invoiceNumber}</span>
  )},
  { accessorKey: 'partyName', header: 'Party' },
  { accessorKey: 'dueDate', header: 'Due Date' },
  { accessorKey: 'outstandingPaise', header: 'Outstanding', cell: ({ row }) => (
    <span className="font-mono font-medium">{(row.original.outstandingPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
  )},
  { accessorKey: 'ageDays', header: 'Age', cell: ({ row }) => {
    const days = row.original.ageDays;
    const color = days > 60 ? 'text-red-600' : days > 30 ? 'text-amber-600' : 'text-foreground';
    return <span className={`font-medium ${color}`}>{days} days</span>;
  }},
];

const bucketLabels = ['0-30 days', '31-60 days', '61-90 days', '91-120 days', '120+ days'];

function computeBuckets(entries: AgingEntry[]) {
  const buckets = bucketLabels.map((label) => ({ label, amount: 0, count: 0 }));
  for (const entry of entries) {
    const idx = entry.ageDays <= 30 ? 0 : entry.ageDays <= 60 ? 1 : entry.ageDays <= 90 ? 2 : entry.ageDays <= 120 ? 3 : 4;
    buckets[idx]!.amount += entry.outstandingPaise;
    buckets[idx]!.count += 1;
  }
  return buckets;
}

export default function AgingReportPage() {
  const [activeTab, setActiveTab] = React.useState<'AR' | 'AP'>('AR');
  const data = activeTab === 'AR' ? mockArAging : mockApAging;
  const buckets = computeBuckets(data);
  const total = data.reduce((s, e) => s + e.outstandingPaise, 0);

  const formatAmount = (paise: number) =>
    (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aging Report"
        description="Accounts receivable and payable aging analysis."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Reports', href: '/finance/reports' },
          { label: 'Aging' },
        ]}
      />

      <div className="flex gap-2">
        {(['AR', 'AP'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activeTab === tab ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'
            }`}
          >
            {tab === 'AR' ? 'Accounts Receivable' : 'Accounts Payable'}
          </button>
        ))}
      </div>

      {/* Aging Buckets */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{bucket.label}</p>
            <p className="mt-1 text-lg font-bold">{formatAmount(bucket.amount)}</p>
            <p className="text-xs text-muted-foreground">{bucket.count} invoice(s)</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Total Outstanding ({activeTab === 'AR' ? 'Receivable' : 'Payable'}):</span>
          <span className="font-bold">{formatAmount(total)}</span>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="partyName"
        searchPlaceholder="Search by party name..."
      />
    </div>
  );
}
