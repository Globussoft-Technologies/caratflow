'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import { PageEditor } from '@/features/cms';

// Mock data -- in production from tRPC: cms.pages.list
const mockPages = [
  { id: '1', title: 'About Us', slug: 'about-us', isPublished: true, publishedAt: '2026-03-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z' },
  { id: '2', title: 'Shipping & Returns', slug: 'shipping-returns', isPublished: true, publishedAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-20T00:00:00Z' },
  { id: '3', title: 'Privacy Policy', slug: 'privacy-policy', isPublished: true, publishedAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
  { id: '4', title: 'Terms of Service', slug: 'terms-of-service', isPublished: true, publishedAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
  { id: '5', title: 'Contact Us', slug: 'contact-us', isPublished: true, publishedAt: '2026-03-15T00:00:00Z', updatedAt: '2026-03-15T00:00:00Z' },
  { id: '6', title: 'Hallmark Information (Draft)', slug: 'hallmark-info', isPublished: false, publishedAt: null, updatedAt: '2026-04-05T00:00:00Z' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PagesListPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Static Pages"
        description="Manage content pages for your storefront."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CMS', href: '/cms' },
          { label: 'Pages' },
        ]}
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Page
          </button>
        }
      />

      {showForm && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-4">Create Page</h3>
          <PageEditor
            onSubmit={(data) => {
              console.log('Create page:', data);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Pages List */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Page</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Updated</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockPages.map((page) => (
              <tr key={page.id} className="transition-colors hover:bg-accent/50">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium">{page.title}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-muted-foreground">/{page.slug}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={page.isPublished ? 'Published' : 'Draft'}
                    variant={getStatusVariant(page.isPublished ? 'ACTIVE' : 'PENDING')}
                    dot
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{formatDate(page.updatedAt)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {page.isPublished && (
                      <a
                        href={`/page/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded p-1.5 transition-colors hover:bg-accent"
                        title="View"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
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
