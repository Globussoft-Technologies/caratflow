'use client';

import { useState } from 'react';
import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Plus, Edit, Trash2, Eye, BookOpen } from 'lucide-react';

// Mock data -- in production from tRPC: cms.blog.list
const mockPosts = [
  { id: '1', title: 'How to Choose the Perfect Engagement Ring', slug: 'choose-perfect-engagement-ring', author: 'Priya Sharma', categoryTag: 'Buying Guide', isPublished: true, publishedAt: '2026-04-01T00:00:00Z', viewCount: 342, readTimeMinutes: 7 },
  { id: '2', title: 'Gold Purity: Understanding 22K vs 24K', slug: 'gold-purity-guide', author: 'Rajesh Kumar', categoryTag: 'Education', isPublished: true, publishedAt: '2026-03-25T00:00:00Z', viewCount: 567, readTimeMinutes: 5 },
  { id: '3', title: 'Jewelry Care Tips for the Monsoon Season', slug: 'monsoon-jewelry-care', author: 'Priya Sharma', categoryTag: 'Jewelry Care', isPublished: true, publishedAt: '2026-03-20T00:00:00Z', viewCount: 198, readTimeMinutes: 4 },
  { id: '4', title: 'Wedding Jewelry Trends 2026', slug: 'wedding-trends-2026', author: 'Anita Desai', categoryTag: 'Trends', isPublished: true, publishedAt: '2026-03-15T00:00:00Z', viewCount: 892, readTimeMinutes: 10 },
  { id: '5', title: 'Lab-Grown vs Natural Diamonds: A Comparison', slug: 'lab-grown-natural-diamonds', author: 'Rajesh Kumar', categoryTag: 'Education', isPublished: false, publishedAt: null, viewCount: 0, readTimeMinutes: 8 },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BlogListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog Posts"
        description="Manage blog articles for your storefront."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CMS', href: '/cms' },
          { label: 'Blog' },
        ]}
        actions={
          <a
            href="/cms/blog/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Post
          </a>
        }
      />

      {/* Blog Posts List */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Post</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Published</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Views</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockPosts.map((post) => (
              <tr key={post.id} className="transition-colors hover:bg-accent/50">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{post.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">by {post.author}</span>
                      <span className="text-xs text-muted-foreground">{post.readTimeMinutes} min read</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {post.categoryTag && (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {post.categoryTag}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    label={post.isPublished ? 'Published' : 'Draft'}
                    variant={getStatusVariant(post.isPublished ? 'ACTIVE' : 'PENDING')}
                    dot
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted-foreground">{formatDate(post.publishedAt)}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    <span>{post.viewCount.toLocaleString()}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <a
                      href={`/cms/blog/${post.id}`}
                      className="rounded p-1.5 transition-colors hover:bg-accent"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </a>
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
