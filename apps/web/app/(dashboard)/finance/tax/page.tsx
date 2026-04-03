'use client';

import * as React from 'react';
import { PageHeader, StatCard } from '@caratflow/ui';
import { IndianRupee, FileSpreadsheet, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// Mock tax data
const mockTaxSummary = {
  currentMonth: {
    igstPayable: 45000_00,
    cgstPayable: 125000_00,
    sgstPayable: 125000_00,
    totalPayable: 295000_00,
  },
  tdsCollected: 15000_00,
  tcsCollected: 8500_00,
  itcAvailable: 180000_00,
};

export default function TaxDashboardPage() {
  const formatAmount = (paise: number) =>
    (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Management"
        description="GST liability, TDS/TCS tracking, and return filing worksheets."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Tax' },
        ]}
      />

      {/* GST Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="GST Payable (Apr 2026)"
          value={formatAmount(mockTaxSummary.currentMonth.totalPayable)}
          icon={<IndianRupee className="h-5 w-5 text-orange-600" />}
        />
        <StatCard
          title="ITC Available"
          value={formatAmount(mockTaxSummary.itcAvailable)}
          icon={<IndianRupee className="h-5 w-5 text-emerald-600" />}
        />
        <StatCard
          title="TDS Collected"
          value={formatAmount(mockTaxSummary.tdsCollected)}
          icon={<IndianRupee className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="TCS Collected"
          value={formatAmount(mockTaxSummary.tcsCollected)}
          icon={<IndianRupee className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* GST Breakdown */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">GST Liability Breakdown - April 2026</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-md border p-4">
            <p className="text-xs text-muted-foreground">CGST Payable</p>
            <p className="mt-1 text-lg font-bold">{formatAmount(mockTaxSummary.currentMonth.cgstPayable)}</p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-xs text-muted-foreground">SGST Payable</p>
            <p className="mt-1 text-lg font-bold">{formatAmount(mockTaxSummary.currentMonth.sgstPayable)}</p>
          </div>
          <div className="rounded-md border p-4">
            <p className="text-xs text-muted-foreground">IGST Payable</p>
            <p className="mt-1 text-lg font-bold">{formatAmount(mockTaxSummary.currentMonth.igstPayable)}</p>
          </div>
        </div>
      </div>

      {/* Filing Links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/finance/tax/gstr1"
          className="flex items-center justify-between rounded-lg border bg-card p-6 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="font-semibold">GSTR-1 Worksheet</h3>
              <p className="text-sm text-muted-foreground">Outward supplies summary for filing</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        <Link
          href="/finance/tax/gstr3b"
          className="flex items-center justify-between rounded-lg border bg-card p-6 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
            <div>
              <h3 className="font-semibold">GSTR-3B Worksheet</h3>
              <p className="text-sm text-muted-foreground">Monthly summary return for tax payment</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
