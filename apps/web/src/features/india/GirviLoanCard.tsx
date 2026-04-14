'use client';

import * as React from 'react';
import { StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Scale, Calendar, IndianRupee } from 'lucide-react';
import Link from 'next/link';

interface GirviLoanCardProps {
  id: string;
  loanNumber: string;
  customerName: string;
  metalType: string;
  netWeightG: string;
  purityFineness: number;
  loanAmountPaise: number;
  outstandingPrincipalPaise: number;
  outstandingInterestPaise: number;
  dueDate: string;
  status: string;
}

function formatPaise(paise: number): string {
  return `${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function GirviLoanCard({
  id,
  loanNumber,
  customerName,
  metalType,
  netWeightG,
  purityFineness,
  loanAmountPaise,
  outstandingPrincipalPaise,
  outstandingInterestPaise,
  dueDate,
  status,
}: GirviLoanCardProps) {
  const totalOutstanding = outstandingPrincipalPaise + outstandingInterestPaise;
  const isOverdue = new Date(dueDate) < new Date() && ['ACTIVE', 'PARTIALLY_PAID'].includes(status);

  return (
    <Link
      href={`/finance/girvi/${id}`}
      className="block rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-sm text-muted-foreground">{loanNumber}</span>
        <StatusBadge label={status} variant={getStatusVariant(status)} />
      </div>

      <p className="font-medium">{customerName}</p>

      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Scale className="h-3.5 w-3.5" /> {metalType} {netWeightG}g ({purityFineness})
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" /> {dueDate}
          {isOverdue && <span className="text-red-500">(Overdue)</span>}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Loan Amount</p>
          <p className="font-mono text-sm">{formatPaise(loanAmountPaise)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className={`font-mono text-sm font-medium ${totalOutstanding > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {formatPaise(totalOutstanding)}
          </p>
        </div>
      </div>
    </Link>
  );
}
