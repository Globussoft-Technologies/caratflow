'use client';

import { useState } from 'react';
import { Plus, X, Search } from 'lucide-react';

interface SegmentCriteria {
  customerType?: string[];
  city?: string[];
  state?: string[];
  loyaltyTier?: string[];
  minLoyaltyPoints?: number;
  maxLoyaltyPoints?: number;
  hasEmail?: boolean;
  hasPhone?: boolean;
}

interface SegmentBuilderProps {
  initialCriteria?: SegmentCriteria;
  onPreview?: (criteria: SegmentCriteria) => void;
  onSave?: (name: string, description: string, criteria: SegmentCriteria) => void;
  previewCount?: number | null;
}

const CUSTOMER_TYPES = ['RETAIL', 'WHOLESALE', 'CORPORATE'];
const TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];

export function SegmentBuilder({ initialCriteria, onPreview, onSave, previewCount }: SegmentBuilderProps) {
  const [criteria, setCriteria] = useState<SegmentCriteria>(initialCriteria ?? {});
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const toggleArrayValue = (key: keyof SegmentCriteria, value: string) => {
    const current = (criteria[key] as string[] | undefined) ?? [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setCriteria({ ...criteria, [key]: updated.length > 0 ? updated : undefined });
  };

  return (
    <div className="space-y-6">
      {/* Segment Info */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Segment Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="e.g., High-Value Mumbai Customers"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Brief description..."
          />
        </div>
      </div>

      {/* Criteria */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Filter Criteria</h4>

        {/* Customer Type */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Customer Type</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {CUSTOMER_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => toggleArrayValue('customerType', type)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  criteria.customerType?.includes(type)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Loyalty Tier */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Loyalty Tier</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {TIERS.map((tier) => (
              <button
                key={tier}
                onClick={() => toggleArrayValue('loyaltyTier', tier)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  criteria.loyaltyTier?.includes(tier)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Points Range */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Min Loyalty Points</label>
            <input
              type="number"
              value={criteria.minLoyaltyPoints ?? ''}
              onChange={(e) => setCriteria({
                ...criteria,
                minLoyaltyPoints: e.target.value ? parseInt(e.target.value) : undefined,
              })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Max Loyalty Points</label>
            <input
              type="number"
              value={criteria.maxLoyaltyPoints ?? ''}
              onChange={(e) => setCriteria({
                ...criteria,
                maxLoyaltyPoints: e.target.value ? parseInt(e.target.value) : undefined,
              })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="No limit"
            />
          </div>
        </div>

        {/* Contact Filters */}
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={criteria.hasEmail ?? false}
              onChange={(e) => setCriteria({ ...criteria, hasEmail: e.target.checked || undefined })}
            />
            Has Email
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={criteria.hasPhone ?? false}
              onChange={(e) => setCriteria({ ...criteria, hasPhone: e.target.checked || undefined })}
            />
            Has Phone
          </label>
        </div>
      </div>

      {/* Preview + Save */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {previewCount !== null && previewCount !== undefined && (
            <p className="text-sm">
              <span className="font-bold">{previewCount.toLocaleString('en-IN')}</span> customers match
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPreview?.(criteria)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-accent"
          >
            <Search className="h-4 w-4" /> Preview
          </button>
          <button
            onClick={() => onSave?.(name, description, criteria)}
            disabled={!name}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Save Segment
          </button>
        </div>
      </div>
    </div>
  );
}
