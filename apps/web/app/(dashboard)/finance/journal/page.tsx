'use client';

import * as React from 'react';
import { PageHeader, StatusBadge, getStatusVariant, DataTable, type ColumnDef } from '@caratflow/ui';
import { Plus, BookOpen } from 'lucide-react';
import { JournalEntryForm } from '@/features/finance/journal-entry-form';

interface JournalEntryRow {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  reference: string;
  status: string;
  totalDebit: number;
  totalCredit: number;
}

// Mock data
const mockEntries: JournalEntryRow[] = [
  { id: '1', entryNumber: 'JE-202604-0001', date: '2026-04-03', description: 'Gold necklace sale', reference: 'INV-202604-0012', status: 'POSTED', totalDebit: 185000_00, totalCredit: 185000_00 },
  { id: '2', entryNumber: 'JE-202604-0002', date: '2026-04-03', description: 'Purchase payment - Rajesh Gold', reference: 'PINV-202604-0005', status: 'POSTED', totalDebit: 450000_00, totalCredit: 450000_00 },
  { id: '3', entryNumber: 'JE-202604-0003', date: '2026-04-02', description: 'Making charges', reference: '', status: 'DRAFT', totalDebit: 25000_00, totalCredit: 25000_00 },
];

const mockAccounts = [
  { id: 'acc-1', accountCode: '1001', name: 'Cash' },
  { id: 'acc-2', accountCode: '1002', name: 'Bank - SBI' },
  { id: 'acc-3', accountCode: '1100', name: 'Accounts Receivable' },
  { id: 'acc-4', accountCode: '2001', name: 'Accounts Payable' },
  { id: 'acc-5', accountCode: '4001', name: 'Sales Revenue' },
  { id: 'acc-6', accountCode: '5001', name: 'Cost of Goods Sold' },
  { id: 'acc-7', accountCode: '5002', name: 'Making Charges Expense' },
];

const columns: ColumnDef<JournalEntryRow, unknown>[] = [
  { accessorKey: 'entryNumber', header: 'Entry #', cell: ({ row }) => (
    <span className="font-mono text-sm">{row.original.entryNumber}</span>
  )},
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'reference', header: 'Reference', cell: ({ row }) => (
    <span className="text-muted-foreground">{row.original.reference || '-'}</span>
  )},
  { accessorKey: 'totalDebit', header: 'Debit', cell: ({ row }) => (
    <span className="font-mono">{(row.original.totalDebit / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
  )},
  { accessorKey: 'totalCredit', header: 'Credit', cell: ({ row }) => (
    <span className="font-mono">{(row.original.totalCredit / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
  )},
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => (
    <StatusBadge label={row.original.status} variant={getStatusVariant(row.original.status)} />
  )},
];

export default function JournalEntriesPage() {
  const [showForm, setShowForm] = React.useState(false);

  const handleSubmit = (data: unknown) => {
    // Will call trpc.financial.journal.create.mutate(data)
    console.log('Create journal entry:', data);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Entries"
        description="Double-entry journal for all financial transactions."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Journal Entries' },
        ]}
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New Entry
          </button>
        }
      />

      {showForm && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <BookOpen className="h-5 w-5" /> New Journal Entry
          </h3>
          <JournalEntryForm accounts={mockAccounts} onSubmit={handleSubmit} />
        </div>
      )}

      <DataTable
        columns={columns}
        data={mockEntries}
        searchKey="description"
        searchPlaceholder="Search journal entries..."
      />
    </div>
  );
}
