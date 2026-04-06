'use client';

import { useState } from 'react';
import type { SeoMetadataResponse } from '@caratflow/shared-types';

interface SeoFormProps {
  metadata?: SeoMetadataResponse;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

const PAGE_TYPES = ['HOME', 'CATEGORY', 'PRODUCT', 'COLLECTION', 'BLOG'] as const;

export function SeoForm({ metadata, onSubmit, onCancel }: SeoFormProps) {
  const [pageType, setPageType] = useState(metadata?.pageType ?? 'HOME');
  const [pageIdentifier, setPageIdentifier] = useState(metadata?.pageIdentifier ?? '');
  const [metaTitle, setMetaTitle] = useState(metadata?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(metadata?.metaDescription ?? '');
  const [ogImage, setOgImage] = useState(metadata?.ogImage ?? '');
  const [canonicalUrl, setCanonicalUrl] = useState(metadata?.canonicalUrl ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      pageType,
      pageIdentifier,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      ogImage: ogImage || undefined,
      canonicalUrl: canonicalUrl || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Page Type *</label>
          <select
            value={pageType}
            onChange={(e) => setPageType(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {PAGE_TYPES.map((pt) => (
              <option key={pt} value={pt}>{pt}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Page Identifier *</label>
          <input
            type="text"
            value={pageIdentifier}
            onChange={(e) => setPageIdentifier(e.target.value)}
            required
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g., home, product UUID, category slug"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Meta Title</label>
        <input
          type="text"
          value={metaTitle}
          onChange={(e) => setMetaTitle(e.target.value)}
          maxLength={70}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="SEO title"
        />
        <p className="text-xs text-muted-foreground">{metaTitle.length}/70 characters</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Meta Description</label>
        <textarea
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          maxLength={160}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="SEO description"
        />
        <p className="text-xs text-muted-foreground">{metaDescription.length}/160 characters</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">OG Image URL</label>
          <input
            type="url"
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="https://..."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Canonical URL</label>
          <input
            type="url"
            value={canonicalUrl}
            onChange={(e) => setCanonicalUrl(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* SEO Preview */}
      <div className="rounded-md border p-4 space-y-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search Preview</h3>
        <p className="text-base font-medium text-blue-700 line-clamp-1">
          {metaTitle || 'Page Title'}
        </p>
        <p className="text-xs text-green-700">
          {canonicalUrl || 'https://yourstore.com/page'}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {metaDescription || 'Meta description will appear here in search results...'}
        </p>
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
          {metadata ? 'Update SEO' : 'Save SEO'}
        </button>
      </div>
    </form>
  );
}
