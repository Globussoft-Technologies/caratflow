'use client';

import Link from 'next/link';
import { PageHeader } from '@caratflow/ui';
import { FileText } from 'lucide-react';

export default function TaxPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tax" description="GST returns and tax liability." breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Finance', href: '/finance' },
        { label: 'Tax' },
      ]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/finance/tax/gstr1" className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">GSTR-1 (Outward supplies)</span>
        </Link>
        <Link href="/finance/tax/gstr3b" className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">GSTR-3B (Summary return)</span>
        </Link>
      </div>
    </div>
  );
}
