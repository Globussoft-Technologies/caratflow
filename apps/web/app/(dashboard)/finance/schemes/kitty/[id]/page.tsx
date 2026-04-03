'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge } from '@caratflow/ui';
import { Users, IndianRupee, Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────────

const mockScheme = {
  id: '1',
  schemeName: 'Diwali Gold Kitty 2026',
  schemeType: 'KITTY',
  monthlyAmountPaise: 5_000_00,
  durationMonths: 12,
  totalValuePaise: 60_000_00,
  bonusPercent: 500, // 5%
  startDate: '2025-11-01',
  endDate: '2026-10-31',
  status: 'ACTIVE',
  maxMembers: 30,
  currentMembers: 28,
  members: [
    { id: 'm1', memberNumber: 'DIW-0001', customerName: 'Priya Sharma', paidInstallments: 5, totalPaidPaise: 25_000_00, status: 'ACTIVE' },
    { id: 'm2', memberNumber: 'DIW-0002', customerName: 'Anita Gupta', paidInstallments: 5, totalPaidPaise: 25_000_00, status: 'ACTIVE' },
    { id: 'm3', memberNumber: 'DIW-0003', customerName: 'Meera Joshi', paidInstallments: 4, totalPaidPaise: 20_000_00, status: 'ACTIVE' },
    { id: 'm4', memberNumber: 'DIW-0004', customerName: 'Kavita Singh', paidInstallments: 3, totalPaidPaise: 15_000_00, status: 'ACTIVE' },
    { id: 'm5', memberNumber: 'DIW-0005', customerName: 'Rekha Patel', paidInstallments: 0, totalPaidPaise: 0, status: 'DEFAULTED' },
  ],
};

function formatPaise(paise: number): string {
  return `${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ─── Installment Grid Component ───────────────────────────────────

function InstallmentGrid({ durationMonths, paidInstallments }: { durationMonths: number; paidInstallments: number }) {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: durationMonths }, (_, i) => {
        const month = i + 1;
        const isPaid = month <= paidInstallments;
        const isCurrent = month === paidInstallments + 1;
        return (
          <div
            key={month}
            className={`flex h-6 w-6 items-center justify-center rounded text-xs font-medium ${
              isPaid
                ? 'bg-emerald-500 text-white'
                : isCurrent
                  ? 'bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                  : 'bg-muted text-muted-foreground'
            }`}
            title={`Month ${month}: ${isPaid ? 'Paid' : isCurrent ? 'Due' : 'Upcoming'}`}
          >
            {month}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function KittySchemeDetailPage() {
  const params = useParams();
  const _schemeId = params.id as string;
  const scheme = mockScheme;

  const totalCollected = scheme.members.reduce((sum, m) => sum + m.totalPaidPaise, 0);
  const collectionRate = scheme.totalValuePaise > 0
    ? Math.round((totalCollected / (scheme.totalValuePaise * scheme.currentMembers)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={scheme.schemeName}
        description={`${scheme.schemeType} scheme - ${scheme.durationMonths} months`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Schemes', href: '/finance/schemes' },
          { label: 'Kitty', href: '/finance/schemes/kitty' },
          { label: scheme.schemeName },
        ]}
        actions={
          <div className="flex gap-2">
            <button className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
              Enroll Member
            </button>
            <button className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
              Record Payment
            </button>
          </div>
        }
      />

      {/* Scheme Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Scheme Details</h3>
            <StatusBadge status={scheme.status} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div>
              <span className="text-muted-foreground">Monthly Amount</span>
              <p className="mt-0.5 font-mono font-medium">{formatPaise(scheme.monthlyAmountPaise)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Duration</span>
              <p className="mt-0.5 font-medium">{scheme.durationMonths} months</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Value</span>
              <p className="mt-0.5 font-mono font-medium">{formatPaise(scheme.totalValuePaise)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Bonus</span>
              <p className="mt-0.5 font-medium">{scheme.bonusPercent ? `${(scheme.bonusPercent / 100).toFixed(1)}%` : '--'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Start Date</span>
              <p className="mt-0.5 flex items-center gap-1 font-medium"><Calendar className="h-3.5 w-3.5" /> {scheme.startDate}</p>
            </div>
            <div>
              <span className="text-muted-foreground">End Date</span>
              <p className="mt-0.5 font-medium">{scheme.endDate}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Members</span>
              <p className="mt-0.5 flex items-center gap-1 font-medium"><Users className="h-3.5 w-3.5" /> {scheme.currentMembers}/{scheme.maxMembers}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Collection Rate</span>
              <p className="mt-0.5 font-medium">{collectionRate}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold">Collection Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Collected</span>
              <span className="font-mono font-medium text-emerald-600">{formatPaise(totalCollected)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expected Total</span>
              <span className="font-mono">{formatPaise(scheme.totalValuePaise * scheme.currentMembers)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, collectionRate)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Members List with Installment Grid */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">Members & Installment Tracker</h3>
        <div className="space-y-4">
          {scheme.members.map((member) => (
            <div key={member.id} className="rounded-md border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-muted-foreground">{member.memberNumber}</span>
                  <span className="font-medium">{member.customerName}</span>
                  <StatusBadge status={member.status} />
                </div>
                <div className="text-right text-sm">
                  <span className="text-muted-foreground">Paid: </span>
                  <span className="font-mono font-medium text-emerald-600">{formatPaise(member.totalPaidPaise)}</span>
                  <span className="ml-2 text-muted-foreground">({member.paidInstallments}/{scheme.durationMonths})</span>
                </div>
              </div>
              <InstallmentGrid durationMonths={scheme.durationMonths} paidInstallments={member.paidInstallments} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
