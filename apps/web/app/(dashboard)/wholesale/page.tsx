'use client';

import Link from 'next/link';
import { PageHeader, StatCard } from '@caratflow/ui';
import { FileText, Package, IndianRupee, Truck, Users, AlertTriangle, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatPaise } from '@/components/format';

export default function WholesaleDashboardPage() {
  const { data } = trpc.wholesale.getDashboard.useQuery();
  const d = (data as Record<string, unknown> | undefined) ?? {};

  const quickLinks = [
    { label: 'Purchase Orders', href: '/wholesale/purchase-orders', icon: FileText },
    { label: 'Goods Receipts', href: '/wholesale/goods-receipts', icon: Package },
    { label: 'Outgoing Consignments', href: '/wholesale/consignments-out', icon: Truck },
    { label: 'Incoming Consignments', href: '/wholesale/consignments-in', icon: Truck },
    { label: 'Agents & Commissions', href: '/wholesale/agents', icon: Users },
    { label: 'Outstanding & Credit', href: '/wholesale/outstanding', icon: AlertTriangle },
    { label: 'Rate Contracts', href: '/wholesale/rate-contracts', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wholesale & Distribution"
        description="Purchase orders, consignment management, and supplier relationships."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Wholesale' }]}
        actions={
          <Link
            href="/wholesale/purchase-orders/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <FileText className="h-4 w-4" />
            New Purchase Order
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pending POs" value={String((d.pendingPOs as number) ?? 0)} icon={<FileText className="h-4 w-4" />} />
        <StatCard title="Active Consignments" value={String(((d.activeConsignmentsOut as number) ?? 0) + ((d.activeConsignmentsIn as number) ?? 0))} icon={<Package className="h-4 w-4" />} />
        <StatCard title="Receivables" value={formatPaise(d.outstandingReceivablesPaise)} icon={<IndianRupee className="h-4 w-4" />} />
        <StatCard title="Payables" value={formatPaise(d.outstandingPayablesPaise)} icon={<IndianRupee className="h-4 w-4" />} />
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
