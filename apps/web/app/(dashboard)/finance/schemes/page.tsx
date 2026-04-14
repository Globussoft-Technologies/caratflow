'use client';

import Link from 'next/link';
import { PageHeader } from '@caratflow/ui';
import { Gift, PiggyBank } from 'lucide-react';

export default function SchemesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Savings Schemes" description="Kitty and gold savings schemes." breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance', href: '/finance' },
        { label: 'Schemes' },
      ]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/finance/schemes/kitty" className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent">
          <PiggyBank className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Kitty Schemes</span>
        </Link>
        <Link href="/finance/schemes/gold-savings" className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent">
          <Gift className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Gold Savings Schemes</span>
        </Link>
      </div>
    </div>
  );
}
