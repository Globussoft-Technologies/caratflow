'use client';

import * as React from 'react';
import { PageHeader, StatCard, StatusBadge, DataTable, type ColumnDef } from '@caratflow/ui';
import {
  Landmark,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  Gavel,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────

interface GirviLoanRow {
  id: string;
  loanNumber: string;
  customerName: string;
  metalType: string;
  netWeightG: string;
  purity: number;
  loanAmountPaise: number;
  outstandingPrincipalPaise: number;
  outstandingInterestPaise: number;
  disbursedDate: string;
  dueDate: string;
  status: string;
}

// ─── Mock Data ────────────────────────────────────────────────────

const mockDashboard = {
  activeLoans: 47,
  totalPrincipalOutstandingPaise: 3_25_00_000_00,
  totalInterestAccruedPaise: 18_75_000_00,
  overdueLoans: 5,
  upcomingAuctions: 2,
};

const mockLoans: GirviLoanRow[] = [
  { id: '1', loanNumber: 'GRV-202604-0012', customerName: 'Ramesh Gupta', metalType: 'GOLD', netWeightG: '45.2', purity: 916, loanAmountPaise: 15_00_000_00, outstandingPrincipalPaise: 15_00_000_00, outstandingInterestPaise: 1_12_500_00, disbursedDate: '2026-01-15', dueDate: '2027-01-15', status: 'ACTIVE' },
  { id: '2', loanNumber: 'GRV-202604-0011', customerName: 'Sunita Devi', metalType: 'GOLD', netWeightG: '22.8', purity: 750, loanAmountPaise: 6_50_000_00, outstandingPrincipalPaise: 4_00_000_00, outstandingInterestPaise: 32_000_00, disbursedDate: '2025-11-05', dueDate: '2026-11-05', status: 'PARTIALLY_PAID' },
  { id: '3', loanNumber: 'GRV-202604-0010', customerName: 'Anil Sharma', metalType: 'GOLD', netWeightG: '120.5', purity: 999, loanAmountPaise: 55_00_000_00, outstandingPrincipalPaise: 55_00_000_00, outstandingInterestPaise: 8_25_000_00, disbursedDate: '2025-06-01', dueDate: '2026-03-01', status: 'DEFAULTED' },
  { id: '4', loanNumber: 'GRV-202604-0009', customerName: 'Meena Patel', metalType: 'SILVER', netWeightG: '500.0', purity: 999, loanAmountPaise: 2_50_000_00, outstandingPrincipalPaise: 0, outstandingInterestPaise: 0, disbursedDate: '2025-09-20', dueDate: '2026-09-20', status: 'CLOSED' },
  { id: '5', loanNumber: 'GRV-202604-0008', customerName: 'Vijay Kumar', metalType: 'GOLD', netWeightG: '35.0', purity: 916, loanAmountPaise: 11_00_000_00, outstandingPrincipalPaise: 11_00_000_00, outstandingInterestPaise: 2_75_000_00, disbursedDate: '2025-04-10', dueDate: '2026-04-10', status: 'ACTIVE' },
];

// ─── Helpers ──────────────────────────────────────────────────────

function formatRupees(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 10_000_000) return `${(rupees / 10_000_000).toFixed(2)} Cr`;
  if (rupees >= 100_000) return `${(rupees / 100_000).toFixed(2)} L`;
  if (rupees >= 1_000) return `${(rupees / 1_000).toFixed(1)}K`;
  return rupees.toLocaleString('en-IN');
}

function formatPaise(paise: number): string {
  return `${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ─── Columns ──────────────────────────────────────────────────────

const columns: ColumnDef<GirviLoanRow, unknown>[] = [
  {
    accessorKey: 'loanNumber',
    header: 'Loan #',
    cell: ({ row }) => (
      <Link href={`/finance/girvi/${row.original.id}`} className="font-mono text-sm text-primary hover:underline">
        {row.original.loanNumber}
      </Link>
    ),
  },
  { accessorKey: 'customerName', header: 'Customer' },
  {
    accessorKey: 'metalType',
    header: 'Collateral',
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.metalType} {row.original.netWeightG}g ({row.original.purity})
      </span>
    ),
  },
  {
    accessorKey: 'loanAmountPaise',
    header: 'Loan Amount',
    cell: ({ row }) => <span className="font-mono">{formatPaise(row.original.loanAmountPaise)}</span>,
  },
  {
    accessorKey: 'outstandingPrincipalPaise',
    header: 'Outstanding',
    cell: ({ row }) => {
      const total = row.original.outstandingPrincipalPaise + row.original.outstandingInterestPaise;
      return <span className="font-mono text-amber-600">{formatPaise(total)}</span>;
    },
  },
  { accessorKey: 'dueDate', header: 'Due Date' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

// ─── Page ─────────────────────────────────────────────────────────

export default function GirviDashboardPage() {
  const router = useRouter();
  const d = mockDashboard;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Girvi / Mortgage Loans"
        description="Manage mortgage loans against gold & silver collateral."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Girvi' },
        ]}
        actions={
          <Link
            href="/finance/girvi/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New Loan
          </Link>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Active Loans"
          value={String(d.activeLoans)}
          icon={<Landmark className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Principal Outstanding"
          value={formatRupees(d.totalPrincipalOutstandingPaise)}
          icon={<IndianRupee className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          title="Interest Accrued"
          value={formatRupees(d.totalInterestAccruedPaise)}
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="Overdue Loans"
          value={String(d.overdueLoans)}
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
        />
        <StatCard
          title="Upcoming Auctions"
          value={String(d.upcomingAuctions)}
          icon={<Gavel className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* Quick Links */}
      <div className="flex gap-3">
        <Link
          href="/finance/girvi/auction"
          className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium transition-shadow hover:shadow-md"
        >
          <Gavel className="h-4 w-4 text-purple-600" />
          Auction Management
        </Link>
      </div>

      {/* Loans Table */}
      <DataTable
        columns={columns}
        data={mockLoans}
        searchKey="loanNumber"
        searchPlaceholder="Search loans..."
        onRowClick={(row) => router.push(`/finance/girvi/${row.id}`)}
      />
    </div>
  );
}
