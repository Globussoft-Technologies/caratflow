'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge } from '@caratflow/ui';
import { Plus, Edit, Trash2, Search, Wand2 } from 'lucide-react';
import { SeoForm } from '@/features/cms';

// Mock data -- in production from tRPC: cms.seo.list
const mockSeoEntries = [
  { id: '1', pageType: 'HOME', pageIdentifier: 'home', metaTitle: 'Premium Jewelry Store | Shop Gold, Diamond & Silver', metaDescription: 'Discover exquisite handcrafted jewelry...', ogImage: null, canonicalUrl: 'https://store.example.com', createdAt: '2026-03-01', updatedAt: '2026-04-01' },
  { id: '2', pageType: 'CATEGORY', pageIdentifier: 'gold-necklaces', metaTitle: 'Gold Necklaces | Buy Online', metaDescription: 'Shop our collection of gold necklaces...', ogImage: null, canonicalUrl: null, createdAt: '2026-03-10', updatedAt: '2026-03-10' },
  { id: '3', pageType: 'PRODUCT', pageIdentifier: 'prod-uuid-001', metaTitle: '22K Gold Wedding Necklace Set', metaDescription: 'Exquisite 22K gold wedding necklace set...', ogImage: 'https://example.com/product1-og.jpg', canonicalUrl: null, createdAt: '2026-03-15', updatedAt: '2026-03-15' },
  { id: '4', pageType: 'COLLECTION', pageIdentifier: 'wedding-collection', metaTitle: 'Wedding Jewelry Collection', metaDescription: 'Complete your bridal look with our wedding collection...', ogImage: null, canonicalUrl: null, createdAt: '2026-03-20', updatedAt: '2026-03-20' },
  { id: '5', pageType: 'BLOG', pageIdentifier: 'choose-perfect-engagement-ring', metaTitle: 'How to Choose an Engagement Ring | Guide', metaDescription: 'Expert tips on choosing the perfect engagement ring...', ogImage: null, canonicalUrl: null, createdAt: '2026-04-01', updatedAt: '2026-04-01' },
];

const PAGE_TYPE_COLORS: Record<string, string> = {
  HOME: 'bg-purple-100 text-purple-800',
  CATEGORY: 'bg-blue-100 text-blue-800',
  PRODUCT: 'bg-green-100 text-green-800',
  COLLECTION: 'bg-orange-100 text-orange-800',
  BLOG: 'bg-pink-100 text-pink-800',
};

export default function SeoPage() {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = mockSeoEntries.filter(
    (entry) =>
      entry.metaTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.pageIdentifier.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO Metadata"
        description="Manage SEO metadata for storefront pages."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CMS', href: '/cms' },
          { label: 'SEO' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
              title="Auto-generate SEO for all products"
            >
              <Wand2 className="h-4 w-4" />
              Auto Generate
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add SEO Entry
            </button>
          </div>
        }
      />

      {showForm && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-4">Add SEO Metadata</h3>
          <SeoForm
            onSubmit={(data) => {
              console.log('Create SEO:', data);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search SEO entries..."
          className="h-10 w-full rounded-md border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* SEO Entries List */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Page</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Meta Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Description</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((entry) => (
              <tr key={entry.id} className="transition-colors hover:bg-accent/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PAGE_TYPE_COLORS[entry.pageType] ?? 'bg-gray-100 text-gray-800'}`}>
                      {entry.pageType}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{entry.pageIdentifier}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium line-clamp-1">{entry.metaTitle ?? '-'}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{entry.metaDescription ?? '-'}</p>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="rounded p-1.5 transition-colors hover:bg-accent" title="Edit">
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button className="rounded p-1.5 transition-colors hover:bg-destructive/10" title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
