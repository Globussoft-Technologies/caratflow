'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Plus, Edit, Trash2, Image, Calendar } from 'lucide-react';
import { BannerForm } from '@/features/cms';

// Mock data -- in production from tRPC: cms.banners.list
const mockBanners = [
  { id: '1', title: 'Summer Collection 2026', subtitle: 'Up to 20% off on gold jewelry', imageUrl: 'https://example.com/banner1.jpg', linkUrl: '/collections/summer', linkType: 'COLLECTION', position: 'HERO', displayOrder: 1, startDate: '2026-04-01T00:00:00Z', endDate: '2026-06-30T00:00:00Z', isActive: true, targetAudience: 'ALL', createdAt: '2026-04-01', updatedAt: '2026-04-01' },
  { id: '2', title: 'Bridal Season Special', subtitle: 'Exclusive bridal sets', imageUrl: 'https://example.com/banner2.jpg', linkUrl: '/collections/bridal', linkType: 'COLLECTION', position: 'HERO', displayOrder: 2, startDate: null, endDate: null, isActive: true, targetAudience: 'ALL', createdAt: '2026-03-15', updatedAt: '2026-03-15' },
  { id: '3', title: 'Loyalty Members Exclusive', subtitle: '10% extra on diamond rings', imageUrl: 'https://example.com/banner3.jpg', linkUrl: '/category/diamonds', linkType: 'CATEGORY', position: 'SIDEBAR', displayOrder: 1, startDate: null, endDate: null, isActive: true, targetAudience: 'LOYALTY_MEMBERS', createdAt: '2026-03-10', updatedAt: '2026-03-10' },
  { id: '4', title: 'Diwali Pre-Book', subtitle: 'Pre-book and save', imageUrl: 'https://example.com/banner4.jpg', linkUrl: null, linkType: 'NONE', position: 'POPUP', displayOrder: 1, startDate: '2026-10-01T00:00:00Z', endDate: '2026-10-25T00:00:00Z', isActive: false, targetAudience: 'ALL', createdAt: '2026-03-01', updatedAt: '2026-03-01' },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BannersPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banners"
        description="Manage promotional banners for your storefront."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CMS', href: '/cms' },
          { label: 'Banners' },
        ]}
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Banner
          </button>
        }
      />

      {showForm && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-4">Create Banner</h3>
          <BannerForm
            onSubmit={(data) => {
              console.log('Create banner:', data);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Banner List */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Banner</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Position</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Audience</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Schedule</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockBanners.map((banner) => (
              <tr key={banner.id} className="transition-colors hover:bg-accent/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-14 items-center justify-center rounded bg-muted">
                      <Image className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{banner.title}</p>
                      <p className="text-xs text-muted-foreground">{banner.subtitle}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {banner.position}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{banner.targetAudience.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-4 py-3">
                  {banner.startDate || banner.endDate ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(banner.startDate)} - {formatDate(banner.endDate)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Always</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={banner.isActive ? 'Active' : 'Inactive'}
                    variant={getStatusVariant(banner.isActive ? 'ACTIVE' : 'INACTIVE')}
                    dot
                  />
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
