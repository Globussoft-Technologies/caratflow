'use client';

import { PageHeader } from '@caratflow/ui';
import { useRouter } from 'next/navigation';
import { PurchaseOrderForm } from '@/features/wholesale/PurchaseOrderForm';
import { trpc } from '@/lib/trpc';

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const createMutation = trpc.wholesale.createPurchaseOrder.useMutation({
    onSuccess: () => router.push('/wholesale/purchase-orders'),
  });

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
      <PurchaseOrderForm
        onSubmit={(data) => {
          createMutation.mutate(data as never);
        }}
        onCancel={() => router.push('/wholesale/purchase-orders')}
      />
    </div>
  );
}
