'use client';

import { PageHeader } from '@caratflow/ui';
import { DocumentGenerator } from '../../../../../src/features/export/DocumentGenerator';

export default function GenerateDocumentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate Document"
        description="Select an export order and document type to generate shipping documents."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Documents', href: '/export/documents' },
          { label: 'Generate' },
        ]}
      />
      <DocumentGenerator />
    </div>
  );
}
