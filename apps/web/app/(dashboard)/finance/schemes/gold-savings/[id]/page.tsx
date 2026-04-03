'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge } from '@caratflow/ui';
import { Users, IndianRupee, Calendar, Coins, Gift } from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────────

const mockScheme = {
  id: '1',
  schemeName: 'Gold Plus Monthly Plan',
  monthlyAmountPaise: 5_000_00,
  durationMonths: 12,
  bonusMonths: 1,
  maturityBonusPercent: 250, // 2.5%
  startDate: '2025-10-01',
  status: 'ACTIVE',
  terms: 'Pay 11 monthly installments, receive 12th month free. Additional 2.5% bonus on maturity value.',
  members: [
    { id: 'm1', memberNumber: 'GS-0001', customerName: 'Lakshmi Iyer', joinedDate: '2025-10-05', paidInstallments: 6, totalPaidPaise: 30_000_00, maturityDate: '2026-10-05', maturityValuePaise: 61_375_00, status: 'ACTIVE' },
    { id: 'm2', memberNumber: 'GS-0002', customerName: 'Radha Krishna', joinedDate: '2025-10-08', paidInstallments: 6, totalPaidPaise: 30_000_00, maturityDate: '2026-10-08', maturityValuePaise: 61_375_00, status: 'ACTIVE' },
    { id: 'm3', memberNumber: 'GS-0003', customerName: 'Padma Reddy', joinedDate: '2025-10-15', paidInstallments: 5, totalPaidPaise: 25_000_00, maturityDate: '2026-10-15', maturityValuePaise: 61_375_00, status: 'ACTIVE' },
    { id: 'm4', memberNumber: 'GS-0004', customerName: 'Sita Devi', joinedDate: '2025-10-01', paidInstallments: 11, totalPaidPaise: 55_000_00, maturityDate: '2026-10-01', maturityValuePaise: 61_375_00, status: 'MATURED' },
  ],
};

function formatPaise(paise: number): string {
  return `${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ─── Maturity Calculator ──────────────────────────────────────────

function MaturityCalculator({ monthlyPaise, durationMonths, bonusMonths, bonusPercent }: {
  monthlyPaise: number;
  durationMonths: number;
  bonusMonths: number;
  bonusPercent: number;
}) {
  const paidMonths = durationMonths - bonusMonths;
  const totalPaid = monthlyPaise * paidMonths;
  const bonusValue = monthlyPaise * bonusMonths;
  const maturityBonus = Math.round((totalPaid * bonusPercent) / 10000);
  const maturityValue = totalPaid + bonusValue + maturityBonus;

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <Gift className="h-4 w-4 text-amber-600" /> Maturity Calculator
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Monthly Amount</span>
          <span className="font-mono">{formatPaise(monthlyPaise)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Paid Months</span>
          <span>{paidMonths} months</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Paid</span>
          <span className="font-mono">{formatPaise(totalPaid)}</span>
        </div>
        <hr />
        <div className="flex justify-between text-sm text-emerald-600">
          <span>Bonus Month Value ({bonusMonths}mo)</span>
          <span className="font-mono">+{formatPaise(bonusValue)}</span>
        </div>
        <div className="flex justify-between text-sm text-emerald-600">
          <span>Maturity Bonus ({(bonusPercent / 100).toFixed(1)}%)</span>
          <span className="font-mono">+{formatPaise(maturityBonus)}</span>
        </div>
        <hr />
        <div className="flex justify-between text-base font-semibold">
          <span>Maturity Value</span>
          <span className="font-mono text-primary">{formatPaise(maturityValue)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function GoldSavingsSchemeDetailPage() {
  const params = useParams();
  const _schemeId = params.id as string;
  const scheme = mockScheme;

  const totalCollected = scheme.members.reduce((sum, m) => sum + m.totalPaidPaise, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={scheme.schemeName}
        description={`Gold savings - Pay ${scheme.durationMonths - scheme.bonusMonths}, get ${scheme.durationMonths} months`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Schemes', href: '/finance/schemes' },
          { label: 'Gold Savings', href: '/finance/schemes/gold-savings' },
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

      {/* Scheme Info + Calculator */}
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
              <span className="text-muted-foreground">Bonus Months</span>
              <p className="mt-0.5 font-medium text-emerald-600">{scheme.bonusMonths} free</p>
            </div>
            <div>
              <span className="text-muted-foreground">Maturity Bonus</span>
              <p className="mt-0.5 font-medium text-emerald-600">{(scheme.maturityBonusPercent / 100).toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-muted-foreground">Start Date</span>
              <p className="mt-0.5 flex items-center gap-1 font-medium"><Calendar className="h-3.5 w-3.5" /> {scheme.startDate}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Members</span>
              <p className="mt-0.5 flex items-center gap-1 font-medium"><Users className="h-3.5 w-3.5" /> {scheme.members.length}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Collected</span>
              <p className="mt-0.5 font-mono font-medium text-emerald-600">{formatPaise(totalCollected)}</p>
            </div>
          </div>
          {scheme.terms && (
            <div className="mt-4 rounded-md bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">{scheme.terms}</p>
            </div>
          )}
        </div>

        <MaturityCalculator
          monthlyPaise={scheme.monthlyAmountPaise}
          durationMonths={scheme.durationMonths}
          bonusMonths={scheme.bonusMonths}
          bonusPercent={scheme.maturityBonusPercent}
        />
      </div>

      {/* Members */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">Members & Installment Tracker</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Member #</th>
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Joined</th>
                <th className="pb-2 pr-4 font-medium">Installments</th>
                <th className="pb-2 pr-4 font-medium">Paid</th>
                <th className="pb-2 pr-4 font-medium">Maturity</th>
                <th className="pb-2 pr-4 font-medium">Maturity Value</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {scheme.members.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="py-2.5 pr-4 font-mono text-muted-foreground">{m.memberNumber}</td>
                  <td className="py-2.5 pr-4 font-medium">{m.customerName}</td>
                  <td className="py-2.5 pr-4">{m.joinedDate}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-emerald-500"
                          style={{ width: `${(m.paidInstallments / (scheme.durationMonths - scheme.bonusMonths)) * 100}%` }}
                        />
                      </div>
                      <span>{m.paidInstallments}/{scheme.durationMonths - scheme.bonusMonths}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-emerald-600">{formatPaise(m.totalPaidPaise)}</td>
                  <td className="py-2.5 pr-4">{m.maturityDate}</td>
                  <td className="py-2.5 pr-4 font-mono">{formatPaise(m.maturityValuePaise)}</td>
                  <td className="py-2.5"><StatusBadge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
