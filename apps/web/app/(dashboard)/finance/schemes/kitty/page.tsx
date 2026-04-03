'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, StatusBadge, DataTable, type ColumnDef } from '@caratflow/ui';
import { Plus } from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────

interface KittySchemeRow {
  id: string;
  schemeName: string;
  schemeType: string;
  monthlyAmountPaise: number;
  durationMonths: number;
  maxMembers: number;
  currentMembers: number;
  startDate: string;
  endDate: string;
  status: string;
}

// ─── Mock Data ────────────────────────────────────────────────────

const mockSchemes: KittySchemeRow[] = [
  { id: '1', schemeName: 'Diwali Gold Kitty 2026', schemeType: 'KITTY', monthlyAmountPaise: 5_000_00, durationMonths: 12, maxMembers: 30, currentMembers: 28, startDate: '2025-11-01', endDate: '2026-10-31', status: 'ACTIVE' },
  { id: '2', schemeName: 'Silver Savings Chit', schemeType: 'CHIT', monthlyAmountPaise: 2_000_00, durationMonths: 24, maxMembers: 50, currentMembers: 35, startDate: '2025-06-01', endDate: '2027-05-31', status: 'ACTIVE' },
  { id: '3', schemeName: 'Akshaya Tritiya Kitty', schemeType: 'KITTY', monthlyAmountPaise: 10_000_00, durationMonths: 6, maxMembers: 20, currentMembers: 0, startDate: '2026-05-01', endDate: '2026-10-31', status: 'OPEN' },
  { id: '4', schemeName: 'Wedding Gold Fund', schemeType: 'KITTY', monthlyAmountPaise: 25_000_00, durationMonths: 12, maxMembers: 15, currentMembers: 15, startDate: '2025-01-01', endDate: '2025-12-31', status: 'MATURED' },
];

function formatPaise(paise: number): string {
  return `${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

const columns: ColumnDef<KittySchemeRow, unknown>[] = [
  {
    accessorKey: 'schemeName',
    header: 'Scheme',
    cell: ({ row }) => (
      <Link href={`/finance/schemes/kitty/${row.original.id}`} className="text-sm font-medium text-primary hover:underline">
        {row.original.schemeName}
      </Link>
    ),
  },
  {
    accessorKey: 'schemeType',
    header: 'Type',
    cell: ({ row }) => (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        row.original.schemeType === 'KITTY' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/30' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/30'
      }`}>
        {row.original.schemeType}
      </span>
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
    accessorKey: 'currentMembers',
    header: 'Members',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.currentMembers}/{row.original.maxMembers}</span>
    ),
  },
  { accessorKey: 'startDate', header: 'Start' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

// ─── Page ─────────────────────────────────────────────────────────

export default function KittySchemesPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kitty Schemes"
        description="Manage kitty and chit fund schemes."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Schemes', href: '/finance/schemes' },
          { label: 'Kitty' },
        ]}
        actions={
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Scheme
          </button>
        }
      />

      <DataTable
        columns={columns}
        data={mockSchemes}
        searchKey="schemeName"
        searchPlaceholder="Search schemes..."
        onRowClick={(row) => router.push(`/finance/schemes/kitty/${row.id}`)}
      />
    </div>
  );
}
