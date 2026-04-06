'use client';

import { PageHeader } from '@caratflow/ui';
import { ExportOrderForm } from '@/features/export/ExportOrderForm';

export default function NewExportOrderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Export Order"
        description="Create an export order for an international buyer."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Orders', href: '/export/orders' },
          { label: 'New' },
        ]}
      />
      <ExportOrderForm />
    </div>
  );
}
