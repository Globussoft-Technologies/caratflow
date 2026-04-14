'use client';

import Link from 'next/link';
import { PageHeader } from '@caratflow/ui';
import { FileText, List } from 'lucide-react';

export default function ExportDutyPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Customs Duty" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Export', href: '/export' },
        { label: 'Duty' },
      ]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/export/duty/hs-codes" className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent">
          <List className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">HS Codes</span>
        </Link>
        <Link href="/export/licenses" className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">DGFT Licenses</span>
        </Link>
      </div>
    </div>
  );
}
