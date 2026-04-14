'use client';

import Link from 'next/link';
import { PageHeader, StatCard } from '@caratflow/ui';
import { Image, FileText, Grid3x3, HelpCircle, Home, Search, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function CmsDashboardPage() {
  const { data } = trpc.cms.dashboard.useQuery();
  const d = (data as Record<string, unknown> | undefined) ?? {};
  const links = [
    { label: 'Banners', href: '/cms/banners', icon: Image },
    { label: 'Collections', href: '/cms/collections', icon: Grid3x3 },
    { label: 'Pages', href: '/cms/pages', icon: FileText },
    { label: 'Blog', href: '/cms/blog', icon: FileText },
    { label: 'FAQ', href: '/cms/faq', icon: HelpCircle },
    { label: 'Homepage', href: '/cms/homepage', icon: Home },
    { label: 'SEO', href: '/cms/seo', icon: Search },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Content Management" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'CMS' }]} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Banners" value={String((d.activeBanners as number) ?? 0)} icon={<Image className="h-4 w-4" />} />
        <StatCard title="Pages" value={String((d.publishedPages as number) ?? 0)} icon={<FileText className="h-4 w-4" />} />
        <StatCard title="Blog Posts" value={String((d.publishedPosts as number) ?? 0)} icon={<FileText className="h-4 w-4" />} />
        <StatCard title="Collections" value={String((d.activeCollections as number) ?? 0)} icon={<Grid3x3 className="h-4 w-4" />} />
      </div>
      <div className="space-y-2">
        {links.map((l) => (
          <Link key={l.label} href={l.href} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent">
            <div className="flex items-center gap-3"><l.icon className="h-4 w-4" /><span className="text-sm font-medium">{l.label}</span></div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
