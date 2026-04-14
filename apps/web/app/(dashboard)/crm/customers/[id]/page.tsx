'use client';

import { useParams } from 'next/navigation';
import { PageHeader, StatCard } from '@caratflow/ui';
import { User, IndianRupee, Gift, Calendar } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data, isLoading } = trpc.crm.customer360.useQuery({ customerId: id }, { enabled: Boolean(id) });

  if (isLoading || !data) return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  const d = data as Record<string, unknown>;
  const customer = (d.customer as Record<string, unknown> | undefined) ?? {};
  const stats = (d.stats as Record<string, unknown> | undefined) ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${(customer.firstName as string) ?? ''} ${(customer.lastName as string) ?? ''}`.trim()}
        description={(customer.phone as string) ?? (customer.email as string) ?? ''}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'CRM', href: '/crm' },
          { label: 'Customers', href: '/crm/customers' },
          { label: (customer.firstName as string) ?? '' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard title="Total Spent" value={formatPaise(stats.totalSpentPaise)} icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard title="Orders" value={String((stats.totalOrders as number) ?? 0)} icon={<User className="h-4 w-4" />} />
        <StatCard title="Loyalty Points" value={String((stats.loyaltyPoints as number) ?? 0)} icon={<Gift className="h-4 w-4" />} />
        <StatCard title="Avg Ticket" value={formatPaise(stats.averageTicketPaise)} icon={<Calendar className="h-4 w-4" />} />
      </div>

      <div className="rounded-lg border p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{(customer.email as string) ?? '-'}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{(customer.phone as string) ?? '-'}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">City</span><span>{(customer.city as string) ?? '-'}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span>{(customer.customerType as string) ?? '-'}</span></div>
      </div>
    </div>
  );
}
