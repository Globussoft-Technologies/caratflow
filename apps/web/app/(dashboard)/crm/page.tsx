'use client';

import Link from 'next/link';
import { PageHeader, StatCard } from '@caratflow/ui';
import { Users, Target, Gift, Megaphone, MessageSquare, Bell, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function CrmDashboardPage() {
  const { data } = trpc.crm.dashboard.useQuery();
  const d = (data as Record<string, unknown> | undefined) ?? {};

  const links = [
    { label: 'Customers', href: '/crm/customers', icon: Users },
    { label: 'Leads', href: '/crm/leads', icon: Target },
    { label: 'Campaigns', href: '/crm/campaigns', icon: Megaphone },
    { label: 'Loyalty', href: '/crm/loyalty', icon: Gift },
    { label: 'Feedback', href: '/crm/feedback', icon: MessageSquare },
    { label: 'Notifications', href: '/crm/notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM"
        description="Customer relationships, leads, loyalty, and campaigns."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'CRM' }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Customers" value={String((d.totalCustomers as number) ?? 0)} icon={<Users className="h-4 w-4" />} />
        <StatCard title="Active Leads" value={String((d.activeLeads as number) ?? 0)} icon={<Target className="h-4 w-4" />} />
        <StatCard title="Active Campaigns" value={String((d.activeCampaigns as number) ?? 0)} icon={<Megaphone className="h-4 w-4" />} />
        <StatCard title="New (30d)" value={String((d.newCustomers30d as number) ?? 0)} icon={<Users className="h-4 w-4" />} />
      </div>

      <div className="space-y-2">
        {links.map((l) => (
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
