'use client';

import { useState } from 'react';
import { GripVertical, Eye, EyeOff, Settings, Trash2 } from 'lucide-react';

interface HomepageSection {
  id: string;
  sectionType: string;
  displayOrder: number;
  isActive: boolean;
  config: Record<string, unknown> | null;
}

interface HomepageSectionConfiguratorProps {
  sections: HomepageSection[];
  onToggleActive: (id: string) => void;
  onDelete: (id: string) => void;
  onConfigure: (id: string) => void;
  onReorder: (items: Array<{ id: string; displayOrder: number }>) => void;
}

const SECTION_LABELS: Record<string, { label: string; description: string }> = {
  HERO_BANNER: { label: 'Hero Banner', description: 'Main banner carousel at the top' },
  CATEGORY_GRID: { label: 'Category Grid', description: 'Grid of product categories' },
  FEATURED_PRODUCTS: { label: 'Featured Products', description: 'Curated product showcase' },
  NEW_ARRIVALS: { label: 'New Arrivals', description: 'Recently added products' },
  SHOP_BY_OCCASION: { label: 'Shop by Occasion', description: 'Occasion-based product discovery' },
  TESTIMONIALS: { label: 'Testimonials', description: 'Customer reviews and testimonials' },
  NEWSLETTER: { label: 'Newsletter', description: 'Email subscription section' },
  PROMOTION_BANNER: { label: 'Promotion Banner', description: 'Promotional banner section' },
  CUSTOM_HTML: { label: 'Custom HTML', description: 'Custom content block' },
};

export function HomepageSectionConfigurator({
  sections,
  onToggleActive,
  onDelete,
  onConfigure,
  onReorder,
}: HomepageSectionConfiguratorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);

    const items = reordered.map((s, i) => ({ id: s.id, displayOrder: i }));
    onReorder(items);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  return (
    <div className="space-y-2">
      {sections.map((section, index) => {
        const meta = SECTION_LABELS[section.sectionType] ?? {
          label: section.sectionType,
          description: '',
        };

        return (
          <div
            key={section.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
              section.isActive ? 'bg-background' : 'bg-muted/30 opacity-60'
            } ${dragIndex === index ? 'border-primary shadow-sm' : ''}`}
          >
            <div className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-primary/10 px-1.5 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{meta.label}</p>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onConfigure(section.id)}
                className="rounded p-1.5 transition-colors hover:bg-accent"
                title="Configure section"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => onToggleActive(section.id)}
                className="rounded p-1.5 transition-colors hover:bg-accent"
                title={section.isActive ? 'Hide section' : 'Show section'}
              >
                {section.isActive ? (
                  <Eye className="h-4 w-4 text-green-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onDelete(section.id)}
                className="rounded p-1.5 transition-colors hover:bg-destructive/10"
                title="Delete section"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          </div>
        );
      })}

      {sections.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No homepage sections configured. Add sections to build your homepage layout.
          </p>
        </div>
      )}
    </div>
  );
}
