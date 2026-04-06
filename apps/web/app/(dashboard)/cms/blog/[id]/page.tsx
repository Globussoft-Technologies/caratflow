'use client';

import { PageHeader } from '@caratflow/ui';
import { BlogEditor } from '@/features/cms';

// Mock data -- in production from tRPC: cms.blog.getById
const mockPost = {
  id: '1',
  tenantId: 't1',
  title: 'How to Choose the Perfect Engagement Ring',
  slug: 'choose-perfect-engagement-ring',
  excerpt: 'A comprehensive guide to selecting the right engagement ring for your special moment.',
  content: '# How to Choose the Perfect Engagement Ring\n\nChoosing an engagement ring is one of the most significant purchases...',
  coverImageUrl: 'https://example.com/ring-guide.jpg',
  author: 'Priya Sharma',
  categoryTag: 'Buying Guide',
  tags: ['engagement', 'rings', 'buying-guide', 'diamonds'],
  readTimeMinutes: 7,
  isPublished: true,
  publishedAt: new Date('2026-04-01'),
  viewCount: 342,
  createdAt: new Date('2026-03-28'),
  updatedAt: new Date('2026-04-01'),
};

export default function EditBlogPostPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit: ${mockPost.title}`}
        description="Update blog post content and settings."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CMS', href: '/cms' },
          { label: 'Blog', href: '/cms/blog' },
          { label: mockPost.title },
        ]}
      />

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>Views: {mockPost.viewCount.toLocaleString()}</span>
        <span>Published: {mockPost.publishedAt?.toLocaleDateString('en-IN')}</span>
        <span>Last updated: {mockPost.updatedAt.toLocaleDateString('en-IN')}</span>
      </div>

      <div className="rounded-lg border p-4">
        <BlogEditor
          post={mockPost}
          onSubmit={(data) => {
            console.log('Update blog post:', data);
          }}
          onCancel={() => {
            window.history.back();
          }}
        />
      </div>
    </div>
  );
}
