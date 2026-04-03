'use client';

import { PageHeader } from '@caratflow/ui';
import { DutyCalculator } from '../../../../src/features/export/DutyCalculator';

export default function DutyCalculatorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Customs Duty Calculator"
        description="Calculate import duty for destination countries based on HS codes."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Duty Calculator' },
        ]}
        actions={
          <a href="/export/duty/hs-codes" className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent">
            Browse HS Codes
          </a>
        }
      />
      <DutyCalculator />
    </div>
  );
}
