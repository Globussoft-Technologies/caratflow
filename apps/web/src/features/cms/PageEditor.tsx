'use client';

import { useState } from 'react';
import type { PageResponse } from '@caratflow/shared-types';

interface PageEditorProps {
  page?: PageResponse;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function PageEditor({ page, onSubmit, onCancel }: PageEditorProps) {
  const [title, setTitle] = useState(page?.title ?? '');
  const [slug, setSlug] = useState(page?.slug ?? '');
  const [content, setContent] = useState(page?.content ?? '');
  const [metaTitle, setMetaTitle] = useState(page?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(page?.metaDescription ?? '');
  const [isPublished, setIsPublished] = useState(page?.isPublished ?? false);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!page) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      slug,
      content,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      isPublished,
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
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Page title"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Slug *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="h-9 w-full rounded-md border bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="page-slug"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Content *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={16}
          className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Write your page content in HTML or Markdown..."
        />
        <p className="text-xs text-muted-foreground">
          Supports HTML and Markdown formatting.
        </p>
      </div>

      <div className="rounded-md border p-4 space-y-3">
        <h3 className="text-sm font-semibold">SEO Settings</h3>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Meta Title</label>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            maxLength={60}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="SEO title (max 60 chars)"
          />
          <p className="text-xs text-muted-foreground">{metaTitle.length}/60 characters</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Meta Description</label>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            maxLength={160}
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="SEO description (max 160 chars)"
          />
          <p className="text-xs text-muted-foreground">{metaDescription.length}/160 characters</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="page-published"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="h-4 w-4 rounded border"
        />
        <label htmlFor="page-published" className="text-sm font-medium">Published</label>
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
          {page ? 'Update Page' : 'Create Page'}
        </button>
      </div>
    </form>
  );
}
