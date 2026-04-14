'use client';

import Link from 'next/link';
import { PageHeader, StatCard } from '@caratflow/ui';
import { ShoppingCart, IndianRupee, Receipt, Wrench, ClipboardList, TrendingUp, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function RetailDashboardPage() {
  const { data } = trpc.retail.getDashboard.useQuery();
  const d = (data as Record<string, unknown> | undefined) ?? {};

  const quickLinks = [
    { label: 'Sales', href: '/retail/sales', icon: Receipt },
    { label: 'Returns', href: '/retail/returns', icon: ClipboardList },
    { label: 'Repairs', href: '/retail/repairs', icon: Wrench },
    { label: 'Custom Orders', href: '/retail/custom-orders', icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Retail & POS"
        description="Point of sale, sales management, repairs, and custom orders."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Retail' }]}
        actions={
          <Link href="/retail/pos" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <ShoppingCart className="h-4 w-4" /> Open POS
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Sales" value={String((d.todaySalesCount as number) ?? 0)} icon={<Receipt className="h-4 w-4" />} />
        <StatCard title="Today's Revenue" value={formatPaise(d.todayRevenuePaise)} icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard title="Avg. Ticket" value={formatPaise(d.averageTicketPaise)} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Month Revenue" value={formatPaise(d.monthRevenuePaise)} icon={<IndianRupee className="h-4 w-4" />} />
      </div>

      <div className="space-y-2">
        {quickLinks.map((l) => (
          <Link key={l.label} href={l.href} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent">
            <div className="flex items-center gap-3">
              <l.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{l.label}</span>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
