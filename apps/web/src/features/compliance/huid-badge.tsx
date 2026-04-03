'use client';

import { Shield, ShieldCheck, ShieldX } from 'lucide-react';

interface HuidBadgeProps {
  huidNumber: string | null | undefined;
  status?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  ACTIVE: { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', icon: <ShieldCheck className="h-3 w-3" /> },
  SOLD: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: <Shield className="h-3 w-3" /> },
  RETURNED: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', icon: <Shield className="h-3 w-3" /> },
  TRANSFERRED: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: <Shield className="h-3 w-3" /> },
};

export function HuidBadge({ huidNumber, status = 'ACTIVE', size = 'sm' }: HuidBadgeProps) {
  if (!huidNumber) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900 dark:text-red-200">
        <ShieldX className="h-3 w-3" />
        No HUID
      </span>
    );
  }

  const config = statusConfig[status] ?? statusConfig['ACTIVE']!;
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${textSize} font-medium ${config.color}`}>
      {config.icon}
      {huidNumber}
    </span>
  );
}
