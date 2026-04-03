'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, StatusBadge, DataTable, type ColumnDef } from '@caratflow/ui';
import { Plus, Coins } from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────

interface GoldSavingsRow {
  id: string;
  schemeName: string;
  monthlyAmountPaise: number;
  durationMonths: number;
  bonusMonths: number;
  maturityBonusPercent: number;
  memberCount: number;
  startDate: string;
  status: string;
}

// ─── Mock Data ────────────────────────────────────────────────────

const mockSchemes: GoldSavingsRow[] = [
  { id: '1', schemeName: 'Gold Plus Monthly Plan', monthlyAmountPaise: 5_000_00, durationMonths: 12, bonusMonths: 1, maturityBonusPercent: 250, memberCount: 78, startDate: '2025-10-01', status: 'ACTIVE' },
  { id: '2', schemeName: 'Premium Gold Saver', monthlyAmountPaise: 10_000_00, durationMonths: 12, bonusMonths: 1, maturityBonusPercent: 300, memberCount: 42, startDate: '2026-01-01', status: 'ACTIVE' },
  { id: '3', schemeName: 'Lakshmi Gold Fund', monthlyAmountPaise: 2_000_00, durationMonths: 18, bonusMonths: 2, maturityBonusPercent: 200, memberCount: 0, startDate: '2026-05-01', status: 'OPEN' },
];

function formatPaise(paise: number): string {
  return `${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

const columns: ColumnDef<GoldSavingsRow, unknown>[] = [
  {
    accessorKey: 'schemeName',
    header: 'Scheme',
    cell: ({ row }) => (
      <Link href={`/finance/schemes/gold-savings/${row.original.id}`} className="text-sm font-medium text-primary hover:underline">
        {row.original.schemeName}
      </Link>
    ),
  },
  {
    accessorKey: 'monthlyAmountPaise',
    header: 'Monthly',
    cell: ({ row }) => <span className="font-mono text-sm">{formatPaise(row.original.monthlyAmountPaise)}</span>,
  },
  {
    accessorKey: 'durationMonths',
    header: 'Duration',
    cell: ({ row }) => <span className="text-sm">{row.original.durationMonths} months</span>,
  },
  {
    accessorKey: 'bonusMonths',
    header: 'Bonus',
    cell: ({ row }) => (
      <span className="text-sm text-emerald-600">
        Pay {row.original.durationMonths - row.original.bonusMonths}, get {row.original.durationMonths}
        {row.original.maturityBonusPercent > 0 && ` + ${(row.original.maturityBonusPercent / 100).toFixed(1)}%`}
      </span>
    ),
  },
  {
    accessorKey: 'memberCount',
    header: 'Members',
    cell: ({ row }) => <span className="text-sm">{row.original.memberCount}</span>,
  },
  { accessorKey: 'startDate', header: 'Start Date' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

// ─── Page ─────────────────────────────────────────────────────────

export default function GoldSavingsSchemesPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gold Savings Schemes"
        description="Monthly gold savings plans with bonus months at maturity."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Schemes', href: '/finance/schemes' },
          { label: 'Gold Savings' },
        ]}
        actions={
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Scheme
          </button>
        }
      />

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
        <Coins className="mt-0.5 h-5 w-5 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">How Gold Savings Works</p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Customers pay a fixed monthly amount. At maturity, they receive the equivalent value in gold
            including bonus months (e.g., pay 11 months, get 12th month free) plus an additional maturity bonus percentage.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={mockSchemes}
        searchKey="schemeName"
        searchPlaceholder="Search schemes..."
        onRowClick={(row) => router.push(`/finance/schemes/gold-savings/${row.id}`)}
      />
    </div>
  );
}
