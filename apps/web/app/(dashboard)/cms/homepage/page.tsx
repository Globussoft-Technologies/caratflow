'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { Plus, Eye } from 'lucide-react';
import { HomepageSectionConfigurator } from '@/features/cms';

const SECTION_TYPES = [
  { value: 'HERO_BANNER', label: 'Hero Banner' },
  { value: 'CATEGORY_GRID', label: 'Category Grid' },
  { value: 'FEATURED_PRODUCTS', label: 'Featured Products' },
  { value: 'NEW_ARRIVALS', label: 'New Arrivals' },
  { value: 'SHOP_BY_OCCASION', label: 'Shop by Occasion' },
  { value: 'TESTIMONIALS', label: 'Testimonials' },
  { value: 'NEWSLETTER', label: 'Newsletter' },
  { value: 'PROMOTION_BANNER', label: 'Promotion Banner' },
  { value: 'CUSTOM_HTML', label: 'Custom HTML' },
] as const;

// Mock data -- in production from tRPC: cms.homepage.list
const initialSections = [
  { id: '1', sectionType: 'HERO_BANNER', displayOrder: 0, isActive: true, config: { title: 'Hero Slider', limit: 3 } },
  { id: '2', sectionType: 'CATEGORY_GRID', displayOrder: 1, isActive: true, config: { title: 'Shop by Category', limit: 8 } },
  { id: '3', sectionType: 'FEATURED_PRODUCTS', displayOrder: 2, isActive: true, config: { title: 'Featured Collection', limit: 8, showViewAll: true } },
  { id: '4', sectionType: 'PROMOTION_BANNER', displayOrder: 3, isActive: true, config: { title: 'Summer Sale' } },
  { id: '5', sectionType: 'NEW_ARRIVALS', displayOrder: 4, isActive: true, config: { title: 'New Arrivals', limit: 8, showViewAll: true } },
  { id: '6', sectionType: 'TESTIMONIALS', displayOrder: 5, isActive: false, config: { title: 'What Our Customers Say' } },
  { id: '7', sectionType: 'NEWSLETTER', displayOrder: 6, isActive: true, config: { title: 'Stay Updated', subtitle: 'Subscribe to our newsletter for exclusive offers' } },
];

export default function HomepageBuilderPage() {
  const [sections, setSections] = useState(initialSections);
  const [showAddSection, setShowAddSection] = useState(false);

  const handleToggleActive = (id: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)),
    );
  };

  const handleDelete = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const handleConfigure = (id: string) => {
    // In production, open a modal with section-specific config form
    console.log('Configure section:', id);
  };

  const handleReorder = (items: Array<{ id: string; displayOrder: number }>) => {
    setSections((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      return items
        .map((item) => {
          const section = map.get(item.id);
          return section ? { ...section, displayOrder: item.displayOrder } : null;
        })
        .filter(Boolean) as typeof prev;
    });
  };

  const handleAddSection = (sectionType: string) => {
    const newSection = {
      id: `new-${Date.now()}`,
      sectionType,
      displayOrder: sections.length,
      isActive: true,
      config: { title: SECTION_TYPES.find((t) => t.value === sectionType)?.label ?? sectionType },
    };
    setSections((prev) => [...prev, newSection]);
    setShowAddSection(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homepage Builder"
        description="Configure and arrange your storefront homepage sections."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CMS', href: '/cms' },
          { label: 'Homepage' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Eye className="h-4 w-4" />
              Preview
            </a>
            <button
              onClick={() => setShowAddSection(true)}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Section
            </button>
          </div>
        }
      />

      {/* Add Section Dropdown */}
      {showAddSection && (
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Add Homepage Section</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {SECTION_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => handleAddSection(type.value)}
                className="rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent"
              >
                <p className="font-medium">{type.label}</p>
              </button>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setShowAddSection(false)}
              className="text-sm text-muted-foreground hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Section List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Sections ({sections.filter((s) => s.isActive).length} active / {sections.length} total)
          </h2>
          <p className="text-xs text-muted-foreground">Drag to reorder</p>
        </div>
        <HomepageSectionConfigurator
          sections={sections}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
          onConfigure={handleConfigure}
          onReorder={handleReorder}
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={() => console.log('Save layout:', sections)}
          className="inline-flex h-9 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Save Layout
        </button>
      </div>
    </div>
  );
}
