'use client';

import { PageHeader } from '@caratflow/ui';
import { HsCodeLookup } from '../../../../../src/features/export/HsCodeLookup';

export default function HsCodesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="HS Code Reference"
        description="Browse and search Harmonized System codes for jewelry and precious metals (Chapter 71)."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Duty Calculator', href: '/export/duty' },
          { label: 'HS Codes' },
        ]}
      />
      <HsCodeLookup />
    </div>
  );
}
