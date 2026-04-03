'use client';

import * as React from 'react';
import { StatusBadge } from '@caratflow/ui';
import { Users, IndianRupee, Calendar } from 'lucide-react';
import Link from 'next/link';

interface SchemeCardProps {
  id: string;
  schemeName: string;
  schemeType: 'KITTY' | 'CHIT' | 'GOLD_SAVINGS';
  monthlyAmountPaise: number;
  durationMonths: number;
  currentMembers: number;
  maxMembers?: number;
  status: string;
  href: string;
}

function formatPaise(paise: number): string {
  return `${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

const typeLabels: Record<string, { label: string; color: string }> = {
  KITTY: { label: 'Kitty', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30' },
  CHIT: { label: 'Chit', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30' },
  GOLD_SAVINGS: { label: 'Gold Savings', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30' },
};

export function SchemeCard({
  id,
  schemeName,
  schemeType,
  monthlyAmountPaise,
  durationMonths,
  currentMembers,
  maxMembers,
  status,
  href,
}: SchemeCardProps) {
  const typeInfo = typeLabels[schemeType] ?? { label: schemeType, color: 'bg-muted' };

  return (
    <Link href={href} className="block rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeInfo.color}`}>
          {typeInfo.label}
        </span>
        <StatusBadge status={status} />
      </div>

      <h3 className="font-medium">{schemeName}</h3>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Monthly</p>
          <p className="flex items-center gap-1 font-mono font-medium">
            <IndianRupee className="h-3 w-3" /> {formatPaise(monthlyAmountPaise)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Duration</p>
          <p className="flex items-center gap-1 font-medium">
            <Calendar className="h-3 w-3" /> {durationMonths}mo
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Members</p>
          <p className="flex items-center gap-1 font-medium">
            <Users className="h-3 w-3" /> {currentMembers}{maxMembers ? `/${maxMembers}` : ''}
          </p>
        </div>
      </div>
    </Link>
  );
}
