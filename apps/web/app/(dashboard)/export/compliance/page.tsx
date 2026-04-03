'use client';

import { PageHeader } from '@caratflow/ui';
import { ComplianceChecklist } from '../../../../src/features/export/ComplianceChecklist';

export default function ComplianceCheckerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Export Compliance Checker"
        description="Check country-specific compliance requirements for jewelry exports."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Compliance' },
        ]}
      />
      <ComplianceChecklist />
    </div>
  );
}
