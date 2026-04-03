'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { ConsignmentTracker } from '../../../../../src/features/wholesale/ConsignmentTracker';

const mockConsignment = {
  id: '1',
  consignmentNumber: 'CO/2604/0008',
  customerName: 'Priya Jewellers',
  locationId: 'loc-1',
  status: 'ISSUED',
  issuedDate: '2026-04-02',
  dueDate: '2026-04-30',
  totalWeightMg: 50000,
  totalValuePaise: 850000_00,
  notes: null,
  items: [
    { id: 'i1', productId: 'p1', productName: '22K Gold Chain', quantity: 2, weightMg: 25000, valuePaise: 425000_00, returnedQuantity: 0, soldQuantity: 0, status: 'ISSUED' },
    { id: 'i2', productId: 'p2', productName: '18K Gold Ring', quantity: 3, weightMg: 15000, valuePaise: 280000_00, returnedQuantity: 1, soldQuantity: 0, status: 'ISSUED' },
    { id: 'i3', productId: 'p3', productName: 'Silver Bangle Set', quantity: 5, weightMg: 10000, valuePaise: 145000_00, returnedQuantity: 0, soldQuantity: 2, status: 'ISSUED' },
  ],
};

export default function ConsignmentOutDetailPage() {
  const c = mockConsignment;

  return (
    <div className="space-y-6">
      <PageHeader
        title={c.consignmentNumber}
        description={`Outgoing consignment to ${c.customerName}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Wholesale', href: '/wholesale' },
          { label: 'Consignments Out', href: '/wholesale/consignments-out' },
          { label: c.consignmentNumber },
        ]}
        actions={
          <StatusBadge label={c.status.replace(/_/g, ' ')} variant={getStatusVariant(c.status)} dot={false} />
        }
      />

      <ConsignmentTracker items={c.items} direction="out" />
    </div>
  );
}
