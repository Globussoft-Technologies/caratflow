'use client';

import { PageHeader } from '@caratflow/ui';
import { CollectionBuilder } from '@/features/cms';

// Mock data -- in production from tRPC: cms.collections.getById
const mockCollection = {
  id: '1',
  tenantId: 't1',
  name: 'Wedding Collection',
  slug: 'wedding-collection',
  description: 'Exquisite pieces for the big day',
  imageUrl: null,
  products: ['p1', 'p2', 'p3', 'p4'],
  displayOrder: 1,
  isActive: true,
  isFeatured: true,
  createdAt: new Date('2026-04-01'),
  updatedAt: new Date('2026-04-01'),
};

export default function EditCollectionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${mockCollection.name}`}
        description="Update collection details and manage products."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CMS', href: '/cms' },
          { label: 'Collections', href: '/cms/collections' },
          { label: mockCollection.name },
        ]}
      />

      <div className="rounded-lg border p-4">
        <CollectionBuilder
          collection={mockCollection}
          onSubmit={(data) => {
            console.log('Update collection:', data);
          }}
          onCancel={() => {
            window.history.back();
          }}
        />
      </div>
    </div>
  );
}
