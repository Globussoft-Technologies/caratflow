'use client';

import { PageHeader } from '@caratflow/ui';
import { PurchaseOrderForm } from '@/features/wholesale/PurchaseOrderForm';

export default function NewPurchaseOrderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Order"
        description="Create a new purchase order for a supplier."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Purchase Orders', href: '/wholesale/purchase-orders' },
          { label: 'New' },
        ]}
      />
      <PurchaseOrderForm />
    </div>
  );
}
