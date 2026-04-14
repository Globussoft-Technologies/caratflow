'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';

export default function BlogPostDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data, isLoading, refetch } = trpc.cms.blog.getById.useQuery({ id }, { enabled: Boolean(id) });
  const publish = trpc.cms.blog.publish.useMutation({ onSuccess: () => refetch() });
  const unpublish = trpc.cms.blog.unpublish.useMutation({ onSuccess: () => refetch() });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const p: Record<string, unknown> = (data as unknown) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <PageHeader title={(p.title as string) ?? 'Post'} breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'CMS', href: '/cms' },
        { label: 'Blog', href: '/cms/blog' },
        { label: (p.title as string) ?? '' },
      ]} actions={
        <div className="flex gap-2">
          {p.isPublished ? (
            <button onClick={() => unpublish.mutate({ id })} disabled={unpublish.isPending} className="h-9 rounded-md border px-4 text-sm disabled:opacity-50">Unpublish</button>
          ) : (
            <button onClick={() => publish.mutate({ id })} disabled={publish.isPending} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">Publish</button>
          )}
          <StatusBadge label={p.isPublished ? 'Published' : 'Draft'} variant={p.isPublished ? 'success' : 'default'} />
        </div>
      } />
      <div className="rounded-lg border p-4 text-sm prose max-w-none">
        <p className="text-muted-foreground">{(p.excerpt as string) ?? ''}</p>
        <div dangerouslySetInnerHTML={{ __html: (p.content as string) ?? '' }} />
      </div>
    </div>
  );
}
