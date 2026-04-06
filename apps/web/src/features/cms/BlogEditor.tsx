'use client';

import { useState } from 'react';
import type { BlogPostResponse } from '@caratflow/shared-types';

interface BlogEditorProps {
  post?: BlogPostResponse;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function BlogEditor({ post, onSubmit, onCancel }: BlogEditorProps) {
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(post?.coverImageUrl ?? '');
  const [author, setAuthor] = useState(post?.author ?? '');
  const [categoryTag, setCategoryTag] = useState(post?.categoryTag ?? '');
  const [tagsInput, setTagsInput] = useState((post?.tags ?? []).join(', '));
  const [readTimeMinutes, setReadTimeMinutes] = useState(post?.readTimeMinutes ?? 0);
  const [isPublished, setIsPublished] = useState(post?.isPublished ?? false);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!post) {
      setSlug(generateSlug(value));
    }
  };

  /** Estimate read time from content word count */
  const estimateReadTime = () => {
    const words = content.split(/\s+/).filter(Boolean).length;
    setReadTimeMinutes(Math.max(1, Math.ceil(words / 200)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onSubmit({
      title,
      slug,
      excerpt: excerpt || undefined,
      content,
      coverImageUrl: coverImageUrl || undefined,
      author,
      categoryTag: categoryTag || undefined,
      tags,
      readTimeMinutes,
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
            placeholder="Blog post title"
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
            placeholder="blog-post-slug"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Author *</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Author name"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <input
            type="text"
            value={categoryTag}
            onChange={(e) => setCategoryTag(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g., Jewelry Care, Buying Guide"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Cover Image URL</label>
        <input
          type="url"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="https://..."
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Excerpt</label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Brief summary of the blog post..."
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Content *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={20}
          className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Write your blog post content..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tags</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="gold, bridal, trends (comma-separated)"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Read Time (minutes)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={readTimeMinutes}
              onChange={(e) => setReadTimeMinutes(parseInt(e.target.value, 10) || 0)}
              min={0}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={estimateReadTime}
              className="h-9 shrink-0 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent"
            >
              Auto
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="blog-published"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="h-4 w-4 rounded border"
        />
        <label htmlFor="blog-published" className="text-sm font-medium">Published</label>
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
          {post ? 'Update Post' : 'Create Post'}
        </button>
      </div>
    </form>
  );
}
