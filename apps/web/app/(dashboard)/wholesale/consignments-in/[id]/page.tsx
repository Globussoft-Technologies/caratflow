'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { ConsignmentTracker } from '../../../../../src/features/wholesale/ConsignmentTracker';

const mockConsignment = {
  id: '1',
  consignmentNumber: 'CI/2604/0005',
  supplierName: 'ABC Gold Refinery',
  status: 'RECEIVED',
  receivedDate: '2026-04-01',
  dueDate: '2026-04-30',
  totalWeightMg: 100000,
  totalValuePaise: 1500000_00,
  items: [
    { id: 'i1', productId: 'p1', productName: '24K Gold Bar 10g', quantity: 5, weightMg: 50000, valuePaise: 750000_00, returnedQuantity: 0, purchasedQuantity: 2, status: 'RECEIVED' },
    { id: 'i2', productId: 'p2', productName: '22K Gold Wire 50g', quantity: 1, weightMg: 50000, valuePaise: 750000_00, returnedQuantity: 0, purchasedQuantity: 0, status: 'RECEIVED' },
  ],
};

export default function ConsignmentInDetailPage() {
  const c = mockConsignment;

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.consignmentNumber}
        description={`Incoming consignment from ${c.supplierName}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Consignments In', href: '/wholesale/consignments-in' },
          { label: c.consignmentNumber },
        ]}
        actions={
          <StatusBadge label={c.status.replace(/_/g, ' ')} variant={getStatusVariant(c.status)} dot={false} />
        }
      />

      <ConsignmentTracker items={c.items} direction="in" />
    </div>
  );
}
