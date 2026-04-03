'use client';

import * as React from 'react';
import { CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';

interface KycStatusBadgeProps {
  type: 'AADHAAR' | 'PAN' | 'VOTER_ID' | 'PASSPORT' | 'DRIVING_LICENSE';
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  className?: string;
}

const statusConfig = {
  PENDING: { icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20', label: 'Pending' },
  VERIFIED: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20', label: 'Verified' },
  FAILED: { icon: XCircle, color: 'text-red-600 bg-red-50 dark:bg-red-950/20', label: 'Failed' },
  EXPIRED: { icon: AlertTriangle, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/20', label: 'Expired' },
};

const typeLabels: Record<string, string> = {
  AADHAAR: 'Aadhaar',
  PAN: 'PAN',
  VOTER_ID: 'Voter ID',
  PASSPORT: 'Passport',
  DRIVING_LICENSE: 'DL',
};

export function KycStatusBadge({ type, status, className }: KycStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color} ${className ?? ''}`}
    >
      <Icon className="h-3 w-3" />
      {typeLabels[type] ?? type}: {config.label}
    </span>
  );
}
