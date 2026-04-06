'use client';

import { PageHeader } from '@caratflow/ui';
import { ExportInvoiceForm } from '@/features/export/ExportInvoiceForm';

export default function NewExportInvoicePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Export Invoice"
        description="Create a commercial, proforma, or customs invoice."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Invoices', href: '/export/invoices' },
          { label: 'New' },
        ]}
      />
      <ExportInvoiceForm />
    </div>
  );
}
