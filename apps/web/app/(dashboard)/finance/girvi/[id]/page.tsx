'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge } from '@caratflow/ui';
import {
  IndianRupee,
  Calendar,
  Scale,
  User,
  MapPin,
  CreditCard,
  TrendingUp,
  Gavel,
} from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────────

const mockLoan = {
  id: '1',
  loanNumber: 'GRV-202604-0012',
  customerName: 'Ramesh Gupta',
  customerPhone: '+91 98765 43210',
  locationName: 'Main Showroom',
  status: 'ACTIVE',
  metalType: 'GOLD',
  grossWeightG: '48.5',
  netWeightG: '45.2',
  purityFineness: 916,
  collateralDescription: '1x Gold necklace (22K, 35g), 1x Gold bangles pair (22K, 13.5g). Both hallmarked with HUID.',
  appraisedValuePaise: 20_00_000_00,
  loanAmountPaise: 15_00_000_00,
  interestRate: 1800, // 18.00%
  interestType: 'SIMPLE',
  disbursedDate: '2026-01-15',
  dueDate: '2027-01-15',
  outstandingPrincipalPaise: 15_00_000_00,
  outstandingInterestPaise: 1_12_500_00,
  totalPrincipalPaidPaise: 0,
  totalInterestPaidPaise: 0,
  aadhaarVerified: true,
  panVerified: true,
  payments: [
    { id: 'p1', date: '2026-03-15', type: 'INTEREST_ONLY', principalPaise: 0, interestPaise: 22_500_00, totalPaise: 22_500_00, method: 'CASH', reference: null },
    { id: 'p2', date: '2026-02-15', type: 'INTEREST_ONLY', principalPaise: 0, interestPaise: 22_500_00, totalPaise: 22_500_00, method: 'UPI', reference: 'UPI/123456789' },
  ],
  accruals: [
    { date: '2026-04-04', days: 30, principalPaise: 15_00_000_00, interestPaise: 22_500_00, cumulativePaise: 1_12_500_00 },
    { date: '2026-03-05', days: 28, principalPaise: 15_00_000_00, interestPaise: 21_000_00, cumulativePaise: 90_000_00 },
    { date: '2026-02-05', days: 31, principalPaise: 15_00_000_00, interestPaise: 23_250_00, cumulativePaise: 69_000_00 },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────

function formatPaise(paise: number): string {
  return `${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ─── Page ─────────────────────────────────────────────────────────

export default function GirviLoanDetailPage() {
  const params = useParams();
  const _loanId = params.id as string;
  const loan = mockLoan;

  const totalOutstanding = loan.outstandingPrincipalPaise + loan.outstandingInterestPaise;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Loan ${loan.loanNumber}`}
        description={`${loan.metalType} collateral loan for ${loan.customerName}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Girvi', href: '/finance/girvi' },
          { label: loan.loanNumber },
        ]}
        actions={
          <div className="flex gap-2">
            {loan.status === 'ACTIVE' && (
              <>
                <button className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
                  <CreditCard className="mr-1 inline h-4 w-4" /> Record Payment
                </button>
                <button className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20">
                  Mark Defaulted
                </button>
              </>
            )}
            {loan.status === 'DEFAULTED' && (
              <button className="rounded-md border border-purple-200 px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950/20">
                <Gavel className="mr-1 inline h-4 w-4" /> Schedule Auction
              </button>
            )}
          </div>
        }
      />

      {/* Status & Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Loan Info */}
        <div className="rounded-lg border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Loan Details</h3>
            <StatusBadge status={loan.status} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <span className="text-muted-foreground">Customer</span>
              <p className="mt-0.5 flex items-center gap-1 font-medium">
                <User className="h-3.5 w-3.5" /> {loan.customerName}
              </p>
              <p className="text-xs text-muted-foreground">{loan.customerPhone}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Location</span>
              <p className="mt-0.5 flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5" /> {loan.locationName}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Interest</span>
              <p className="mt-0.5 font-medium">{(loan.interestRate / 100).toFixed(2)}% p.a. ({loan.interestType})</p>
            </div>
            <div>
              <span className="text-muted-foreground">Disbursed</span>
              <p className="mt-0.5 flex items-center gap-1 font-medium">
                <Calendar className="h-3.5 w-3.5" /> {loan.disbursedDate}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Due Date</span>
              <p className="mt-0.5 flex items-center gap-1 font-medium">
                <Calendar className="h-3.5 w-3.5" /> {loan.dueDate}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">KYC</span>
              <div className="mt-0.5 flex gap-2">
                <span className={`text-xs font-medium ${loan.aadhaarVerified ? 'text-emerald-600' : 'text-red-500'}`}>
                  Aadhaar {loan.aadhaarVerified ? 'Verified' : 'Pending'}
                </span>
                <span className={`text-xs font-medium ${loan.panVerified ? 'text-emerald-600' : 'text-red-500'}`}>
                  PAN {loan.panVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold">Financial Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Appraised Value</span>
              <span className="font-mono">{formatPaise(loan.appraisedValuePaise)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Loan Amount</span>
              <span className="font-mono font-medium">{formatPaise(loan.loanAmountPaise)}</span>
            </div>
            <hr />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Principal Outstanding</span>
              <span className="font-mono text-amber-600">{formatPaise(loan.outstandingPrincipalPaise)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Interest Accrued</span>
              <span className="font-mono text-amber-600">{formatPaise(loan.outstandingInterestPaise)}</span>
            </div>
            <hr />
            <div className="flex justify-between text-base font-semibold">
              <span>Total Outstanding</span>
              <span className="font-mono text-red-600">{formatPaise(totalOutstanding)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Collateral Info */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">Collateral Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <span className="text-muted-foreground">Metal</span>
            <p className="mt-0.5 font-medium">{loan.metalType}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Gross Weight</span>
            <p className="mt-0.5 flex items-center gap-1 font-medium">
              <Scale className="h-3.5 w-3.5" /> {loan.grossWeightG}g
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Net Weight</span>
            <p className="mt-0.5 font-medium">{loan.netWeightG}g</p>
          </div>
          <div>
            <span className="text-muted-foreground">Purity</span>
            <p className="mt-0.5 font-medium">{loan.purityFineness}</p>
          </div>
        </div>
        <div className="mt-3">
          <span className="text-sm text-muted-foreground">Description</span>
          <p className="mt-0.5 text-sm">{loan.collateralDescription}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Payment History */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4" /> Payment History
          </h3>
          {loan.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {loan.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{p.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">{p.date} via {p.method}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium text-emerald-600">
                      {formatPaise(p.totalPaise)}
                    </p>
                    {p.reference && (
                      <p className="text-xs text-muted-foreground">{p.reference}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interest Accrual Log */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4" /> Interest Accrual Log
          </h3>
          <div className="space-y-3">
            {loan.accruals.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{a.date}</p>
                  <p className="text-xs text-muted-foreground">{a.days} days on {formatPaise(a.principalPaise)}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{formatPaise(a.interestPaise)}</p>
                  <p className="text-xs text-muted-foreground">Cumulative: {formatPaise(a.cumulativePaise)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
