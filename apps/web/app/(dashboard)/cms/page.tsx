'use client';

import { PageHeader, StatCard } from '@caratflow/ui';
import {
  Image,
  LayoutGrid,
  FileText,
  BookOpen,
  HelpCircle,
  Megaphone,
  Home,
  Search,
  ArrowRight,
} from 'lucide-react';

// Mock data -- in production from tRPC: cms.dashboard
const dashboardData = {
  activeBanners: 4,
  totalCollections: 6,
  publishedPages: 5,
  publishedBlogPosts: 12,
  publishedFaqs: 18,
  activeAnnouncements: 1,
  homepageSections: 7,
};

const quickLinks = [
  { label: 'Banners', description: 'Manage promotional banners', href: '/cms/banners', icon: Image, count: 4 },
  { label: 'Collections', description: 'Curated product collections', href: '/cms/collections', icon: LayoutGrid, count: 6 },
  { label: 'Pages', description: 'Static content pages', href: '/cms/pages', icon: FileText, count: 5 },
  { label: 'Blog', description: 'Blog posts and articles', href: '/cms/blog', icon: BookOpen, count: 12 },
  { label: 'FAQ', description: 'Frequently asked questions', href: '/cms/faq', icon: HelpCircle, count: 18 },
  { label: 'Homepage', description: 'Homepage layout builder', href: '/cms/homepage', icon: Home, count: 7 },
  { label: 'SEO', description: 'SEO metadata management', href: '/cms/seo', icon: Search, count: null },
];

export default function CmsDashboardPage() {
  const d = dashboardData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Management"
        description="Manage storefront content: banners, collections, pages, blog, FAQ, and homepage layout."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'CMS' }]}
        actions={
          <a
            href="/cms/homepage"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Home className="h-4 w-4" />
            Edit Homepage
          </a>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Banners"
          value={String(d.activeBanners)}
          icon={<Image className="h-4 w-4" />}
        />
        <StatCard
          title="Collections"
          value={String(d.totalCollections)}
          icon={<LayoutGrid className="h-4 w-4" />}
        />
        <StatCard
          title="Published Pages"
          value={String(d.publishedPages)}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Blog Posts"
          value={String(d.publishedBlogPosts)}
          icon={<BookOpen className="h-4 w-4" />}
        />
      </div>

      {/* Quick Links */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Manage Content</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.count !== null && (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-medium">
                    {item.count}
                  </span>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Announcement Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Announcement</h2>
          <span className="text-xs text-muted-foreground">{d.activeAnnouncements} active</span>
        </div>
        <div className="rounded-lg border p-4">
          <div
            className="flex items-center justify-center gap-2 rounded-md px-4 py-2 text-center text-sm"
            style={{ backgroundColor: '#1e293b', color: '#ffffff' }}
          >
            <Megaphone className="h-4 w-4" />
            <span>Free shipping on orders above Rs. 10,000! Use code: FREESHIP</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Preview of the active announcement bar
          </p>
        </div>
      </div>
    </div>
  );
}
