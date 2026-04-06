'use client';

import { useState } from 'react';
import type { BannerResponse } from '@caratflow/shared-types';

interface BannerFormProps {
  banner?: BannerResponse;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

const LINK_TYPES = ['NONE', 'PRODUCT', 'CATEGORY', 'COLLECTION', 'EXTERNAL'] as const;
const POSITIONS = ['HERO', 'SIDEBAR', 'POPUP', 'INLINE'] as const;
const AUDIENCES = ['ALL', 'NEW_CUSTOMERS', 'RETURNING', 'LOYALTY_MEMBERS'] as const;

export function BannerForm({ banner, onSubmit, onCancel }: BannerFormProps) {
  const [title, setTitle] = useState(banner?.title ?? '');
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? '');
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl ?? '');
  const [linkUrl, setLinkUrl] = useState(banner?.linkUrl ?? '');
  const [linkType, setLinkType] = useState(banner?.linkType ?? 'NONE');
  const [position, setPosition] = useState(banner?.position ?? 'HERO');
  const [displayOrder, setDisplayOrder] = useState(banner?.displayOrder ?? 0);
  const [isActive, setIsActive] = useState(banner?.isActive ?? true);
  const [targetAudience, setTargetAudience] = useState(banner?.targetAudience ?? 'ALL');
  const [startDate, setStartDate] = useState(banner?.startDate ? new Date(banner.startDate).toISOString().slice(0, 16) : '');
  const [endDate, setEndDate] = useState(banner?.endDate ? new Date(banner.endDate).toISOString().slice(0, 16) : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      subtitle: subtitle || undefined,
      imageUrl,
      linkUrl: linkUrl || undefined,
      linkType,
      position,
      displayOrder,
      isActive,
      targetAudience,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Banner title"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Subtitle</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Optional subtitle"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Image URL *</label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          required
          className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="https://..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Link Type</label>
          <select
            value={linkType}
            onChange={(e) => setLinkType(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {LINK_TYPES.map((lt) => (
              <option key={lt} value={lt}>{lt.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Link URL</label>
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Link destination"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Position</label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Target Audience</label>
          <select
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {AUDIENCES.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Display Order</label>
          <input
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
            min={0}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Start Date</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">End Date</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="banner-active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border"
        />
        <label htmlFor="banner-active" className="text-sm font-medium">Active</label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {banner ? 'Update Banner' : 'Create Banner'}
        </button>
      </div>
    </form>
  );
}
