'use client';

import Link from 'next/link';
import { PageHeader, StatusBadge, EmptyState } from '@caratflow/ui';
import { FileText, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatDate } from '@/components/format';

export default function BlogPostsPage() {
  const { data, isLoading } = trpc.cms.blog.list.useQuery({});
  const items = ((data as Array<Record<string, unknown>> | { items?: Array<Record<string, unknown>> } | undefined));
  const rows = Array.isArray(items) ? items : (items?.items ?? []);

  return (
    <div className="space-y-6">
      <PageHeader title="Blog Posts" breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'CMS', href: '/cms' },
        { label: 'Blog' },
      ]} actions={
        <button className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" /> New Post
        </button>
      } />
      <div className="rounded-lg border">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium uppercase text-muted-foreground">
          <span>Title</span>
          <span>Author</span>
          <span>Status</span>
          <span>Published</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<FileText className="h-8 w-8" />} title="No posts" />
        ) : (
          <div className="divide-y">
            {rows.map((p) => (
              <Link key={p.id as string} href={`/cms/blog/${p.id}`} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-accent">
                <span className="font-medium">{(p.title as string) ?? '-'}</span>
                <span>{(p.author as string) ?? '-'}</span>
                <StatusBadge label={p.isPublished ? 'Published' : 'Draft'} variant={p.isPublished ? 'success' : 'default'} />
                <span className="text-muted-foreground">{formatDate(p.publishedAt)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
