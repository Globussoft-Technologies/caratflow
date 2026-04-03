'use client';

import * as React from 'react';
import { PageHeader, StatusBadge, DataTable, type ColumnDef } from '@caratflow/ui';
import { Gavel, Calendar, IndianRupee } from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────

interface AuctionRow {
  id: string;
  loanNumber: string;
  customerName: string;
  metalType: string;
  netWeightG: string;
  outstandingPaise: number;
  reservePricePaise: number;
  auctionDate: string;
  status: string;
  soldPricePaise: number | null;
  buyerName: string | null;
}

// ─── Mock Data ────────────────────────────────────────────────────

const mockAuctions: AuctionRow[] = [
  {
    id: 'a1', loanNumber: 'GRV-202604-0010', customerName: 'Anil Sharma',
    metalType: 'GOLD', netWeightG: '120.5', outstandingPaise: 63_25_000_00,
    reservePricePaise: 70_00_000_00, auctionDate: '2026-04-15',
    status: 'SCHEDULED', soldPricePaise: null, buyerName: null,
  },
  {
    id: 'a2', loanNumber: 'GRV-202603-0003', customerName: 'Deepak Jain',
    metalType: 'GOLD', netWeightG: '55.0', outstandingPaise: 28_50_000_00,
    reservePricePaise: 32_00_000_00, auctionDate: '2026-04-20',
    status: 'SCHEDULED', soldPricePaise: null, buyerName: null,
  },
  {
    id: 'a3', loanNumber: 'GRV-202602-0007', customerName: 'Mohan Lal',
    metalType: 'SILVER', netWeightG: '1200.0', outstandingPaise: 5_80_000_00,
    reservePricePaise: 6_50_000_00, auctionDate: '2026-03-25',
    status: 'COMPLETED', soldPricePaise: 7_20_000_00, buyerName: 'Bijoy Traders',
  },
];

function formatPaise(paise: number): string {
  return `${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ─── Columns ──────────────────────────────────────────────────────

const columns: ColumnDef<AuctionRow, unknown>[] = [
  {
    accessorKey: 'loanNumber',
    header: 'Loan #',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.loanNumber}</span>
    ),
  },
  { accessorKey: 'customerName', header: 'Borrower' },
  {
    accessorKey: 'metalType',
    header: 'Collateral',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.metalType} {row.original.netWeightG}g</span>
    ),
  },
  {
    accessorKey: 'outstandingPaise',
    header: 'Outstanding',
    cell: ({ row }) => <span className="font-mono text-red-600">{formatPaise(row.original.outstandingPaise)}</span>,
  },
  {
    accessorKey: 'reservePricePaise',
    header: 'Reserve Price',
    cell: ({ row }) => <span className="font-mono">{formatPaise(row.original.reservePricePaise)}</span>,
  },
  { accessorKey: 'auctionDate', header: 'Auction Date' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'soldPricePaise',
    header: 'Sold Price',
    cell: ({ row }) => row.original.soldPricePaise
      ? <span className="font-mono text-emerald-600">{formatPaise(row.original.soldPricePaise)}</span>
      : <span className="text-sm text-muted-foreground">--</span>,
  },
];

// ─── Page ─────────────────────────────────────────────────────────

export default function GirviAuctionPage() {
  const [activeTab, setActiveTab] = React.useState<'ALL' | 'SCHEDULED' | 'COMPLETED'>('ALL');

  const filteredAuctions = activeTab === 'ALL'
    ? mockAuctions
    : mockAuctions.filter((a) => a.status === activeTab);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auction Management"
        description="Manage auctions for defaulted girvi loans."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Girvi', href: '/finance/girvi' },
          { label: 'Auctions' },
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <Calendar className="h-8 w-8 text-amber-600" />
          <div>
            <p className="text-2xl font-bold">{mockAuctions.filter((a) => a.status === 'SCHEDULED').length}</p>
            <p className="text-sm text-muted-foreground">Scheduled Auctions</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <Gavel className="h-8 w-8 text-emerald-600" />
          <div>
            <p className="text-2xl font-bold">{mockAuctions.filter((a) => a.status === 'COMPLETED').length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <IndianRupee className="h-8 w-8 text-blue-600" />
          <div>
            <p className="text-2xl font-bold">
              {formatPaise(
                mockAuctions
                  .filter((a) => a.soldPricePaise)
                  .reduce((sum, a) => sum + (a.soldPricePaise ?? 0), 0),
              )}
            </p>
            <p className="text-sm text-muted-foreground">Total Recovered</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {(['ALL', 'SCHEDULED', 'COMPLETED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredAuctions}
        searchKey="loanNumber"
        searchPlaceholder="Search auctions..."
      />
    </div>
  );
}
