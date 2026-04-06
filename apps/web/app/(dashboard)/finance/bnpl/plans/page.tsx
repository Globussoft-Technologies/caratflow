'use client';

import * as React from 'react';
import { PageHeader, StatusBadge, DataTable, type ColumnDef } from '@caratflow/ui';
import { Plus, Percent, CreditCard } from 'lucide-react';

interface EmiPlanRow {
  id: string;
  bankName: string | null;
  tenure: number;
  interestRatePct: number;
  processingFeePaise: number;
  minAmountPaise: number;
  maxAmountPaise: number;
  isNoCostEmi: boolean;
  subventionPct: number;
  cardType: string | null;
  isActive: boolean;
}

const mockPlans: EmiPlanRow[] = [
  {
    id: '1',
    bankName: 'HDFC Bank',
    tenure: 3,
    interestRatePct: 0,
    processingFeePaise: 0,
    minAmountPaise: 100000_00,
    maxAmountPaise: 2000000_00,
    isNoCostEmi: true,
    subventionPct: 300,
    cardType: 'CREDIT',
    isActive: true,
  },
  {
    id: '2',
    bankName: 'HDFC Bank',
    tenure: 6,
    interestRatePct: 0,
    processingFeePaise: 29900,
    minAmountPaise: 100000_00,
    maxAmountPaise: 2000000_00,
    isNoCostEmi: true,
    subventionPct: 600,
    cardType: 'CREDIT',
    isActive: true,
  },
  {
    id: '3',
    bankName: 'ICICI Bank',
    tenure: 9,
    interestRatePct: 1300,
    processingFeePaise: 0,
    minAmountPaise: 300000_00,
    maxAmountPaise: 5000000_00,
    isNoCostEmi: false,
    subventionPct: 0,
    cardType: 'BOTH',
    isActive: true,
  },
  {
    id: '4',
    bankName: 'SBI Card',
    tenure: 12,
    interestRatePct: 1400,
    processingFeePaise: 49900,
    minAmountPaise: 500000_00,
    maxAmountPaise: 10000000_00,
    isNoCostEmi: false,
    subventionPct: 0,
    cardType: 'CREDIT',
    isActive: true,
  },
  {
    id: '5',
    bankName: 'Kotak Mahindra',
    tenure: 6,
    interestRatePct: 1200,
    processingFeePaise: 0,
    minAmountPaise: 200000_00,
    maxAmountPaise: 3000000_00,
    isNoCostEmi: false,
    subventionPct: 0,
    cardType: 'DEBIT',
    isActive: false,
  },
];

function formatCurrency(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

function formatRate(ratePct: number): string {
  if (ratePct === 0) return 'No Cost';
  return `${(ratePct / 100).toFixed(ratePct % 100 === 0 ? 0 : 2)}%`;
}

const columns: ColumnDef<EmiPlanRow, unknown>[] = [
  {
    accessorKey: 'bankName',
    header: 'Bank',
    cell: ({ row }) => (
      <span className="font-medium">{row.original.bankName ?? 'All Banks'}</span>
    ),
  },
  {
    accessorKey: 'tenure',
    header: 'Tenure',
    cell: ({ row }) => (
      <span>{row.original.tenure} months</span>
    ),
  },
  {
    accessorKey: 'interestRatePct',
    header: 'Interest Rate',
    cell: ({ row }) => (
      <span className={row.original.isNoCostEmi ? 'font-medium text-emerald-600' : ''}>
        {formatRate(row.original.interestRatePct)}
      </span>
    ),
  },
  {
    accessorKey: 'processingFeePaise',
    header: 'Processing Fee',
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.processingFeePaise > 0 ? `\u20B9${formatCurrency(row.original.processingFeePaise)}` : 'Free'}
      </span>
    ),
  },
  {
    accessorKey: 'minAmountPaise',
    header: 'Min Amount',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCurrency(row.original.minAmountPaise)}</span>
    ),
  },
  {
    accessorKey: 'maxAmountPaise',
    header: 'Max Amount',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{formatCurrency(row.original.maxAmountPaise)}</span>
    ),
  },
  {
    accessorKey: 'isNoCostEmi',
    header: 'No Cost EMI',
    cell: ({ row }) => {
      if (row.original.isNoCostEmi) {
        return (
          <span className="inline-flex items-center gap-1 text-sm">
            <Percent className="h-3 w-3 text-emerald-600" />
            <span className="text-emerald-600">Yes ({(row.original.subventionPct / 100).toFixed(0)}% subvention)</span>
          </span>
        );
      }
      return <span className="text-muted-foreground">No</span>;
    },
  },
  {
    accessorKey: 'cardType',
    header: 'Card Type',
    cell: ({ row }) => {
      const labels: Record<string, string> = { CREDIT: 'Credit', DEBIT: 'Debit', BOTH: 'Both' };
      return (
        <span className="inline-flex items-center gap-1 text-sm">
          <CreditCard className="h-3 w-3" />
          {labels[row.original.cardType ?? ''] ?? 'Any'}
        </span>
      );
    },
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'} />
    ),
  },
];

export default function EmiPlansPage() {
  const [showForm, setShowForm] = React.useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="EMI Plans"
        description="Configure EMI plans with bank partnerships and no-cost EMI options."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'BNPL & EMI', href: '/finance/bnpl' },
          { label: 'EMI Plans' },
        ]}
        actions={
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add Plan
          </button>
        }
      />

      {showForm && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Add EMI Plan</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Bank Name</label>
              <input type="text" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="e.g., HDFC Bank" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Tenure (months)</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="9">9 months</option>
                <option value="12">12 months</option>
                <option value="18">18 months</option>
                <option value="24">24 months</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Interest Rate (% per annum)</label>
              <input type="number" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="13" step="0.01" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Processing Fee</label>
              <input type="number" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="0" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Min Amount</label>
              <input type="number" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="1000" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Max Amount</label>
              <input type="number" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="500000" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Card Type</label>
              <select className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="">Any</option>
                <option value="CREDIT">Credit Card</option>
                <option value="DEBIT">Debit Card</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" />
                No Cost EMI
              </label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Subvention % (merchant bears)</label>
              <input type="number" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="0" step="0.01" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Save Plan
            </button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={mockPlans}
        searchKey="bankName"
        searchPlaceholder="Search by bank name..."
      />
    </div>
  );
}
