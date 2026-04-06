'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Plus, Edit, Trash2, Star, Package } from 'lucide-react';
import { CollectionBuilder } from '@/features/cms';

// Mock data -- in production from tRPC: cms.collections.list
const mockCollections = [
  { id: '1', name: 'Wedding Collection', slug: 'wedding-collection', description: 'Exquisite pieces for the big day', imageUrl: null, products: ['p1', 'p2', 'p3', 'p4'], displayOrder: 1, isActive: true, isFeatured: true, createdAt: '2026-04-01', updatedAt: '2026-04-01' },
  { id: '2', name: 'Daily Wear', slug: 'daily-wear', description: 'Lightweight jewelry for everyday elegance', imageUrl: null, products: ['p5', 'p6'], displayOrder: 2, isActive: true, isFeatured: false, createdAt: '2026-03-20', updatedAt: '2026-03-20' },
  { id: '3', name: 'Festive Collection', slug: 'festive-collection', description: 'Celebrate in style', imageUrl: null, products: ['p1', 'p3', 'p5', 'p7', 'p8'], displayOrder: 3, isActive: true, isFeatured: true, createdAt: '2026-03-15', updatedAt: '2026-03-15' },
  { id: '4', name: 'Office Wear', slug: 'office-wear', description: 'Professional and elegant', imageUrl: null, products: ['p2', 'p6'], displayOrder: 4, isActive: false, isFeatured: false, createdAt: '2026-03-10', updatedAt: '2026-03-10' },
];

export default function CollectionsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collections"
        description="Curate product collections for your storefront."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CMS', href: '/cms' },
          { label: 'Collections' },
        ]}
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Collection
          </button>
        }
      />

      {showForm && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-4">Create Collection</h3>
          <CollectionBuilder
            onSubmit={(data) => {
              console.log('Create collection:', data);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Collections Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockCollections.map((col) => (
          <div key={col.id} className="rounded-lg border p-4 transition-colors hover:bg-accent/30">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{col.name}</h3>
                  {col.isFeatured && (
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{col.description}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">/{col.slug}</p>
              </div>
              <StatusBadge
                label={col.isActive ? 'Active' : 'Inactive'}
                variant={getStatusVariant(col.isActive ? 'ACTIVE' : 'INACTIVE')}
                dot
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                <span>{col.products.length} products</span>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={`/cms/collections/${col.id}`}
                  className="rounded p-1.5 transition-colors hover:bg-accent"
                  title="Edit"
                >
                  <Edit className="h-4 w-4 text-muted-foreground" />
                </a>
                <button className="rounded p-1.5 transition-colors hover:bg-destructive/10" title="Delete">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
