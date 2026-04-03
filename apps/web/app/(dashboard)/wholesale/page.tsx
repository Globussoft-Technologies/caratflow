'use client';

import { PageHeader, StatCard, StatusBadge, getStatusVariant } from '@caratflow/ui';
import {
  Truck,
  IndianRupee,
  FileText,
  Package,
  ArrowRight,
  Clock,
  AlertTriangle,
  Users,
} from 'lucide-react';

// Mock dashboard data -- in production this comes from tRPC: wholesale.getDashboard
const dashboardData = {
  pendingPOs: 5,
  sentPOs: 8,
  activeConsignmentsOut: 12,
  activeConsignmentsIn: 7,
  outstandingReceivablesPaise: 2500000_00,
  outstandingPayablesPaise: 1800000_00,
  upcomingDueDates: [
    { type: 'PAYMENT' as const, id: '1', number: 'INV/2604/0045', entityName: 'Rajesh Jewellers', dueDate: '2026-04-10', valuePaise: 350000_00 },
    { type: 'PAYMENT' as const, id: '2', number: 'INV/2604/0038', entityName: 'Gold Palace', dueDate: '2026-04-12', valuePaise: 520000_00 },
    { type: 'PAYMENT' as const, id: '3', number: 'INV/2604/0041', entityName: 'Diamond Hub', dueDate: '2026-04-15', valuePaise: 180000_00 },
  ],
  recentPOs: [
    { id: '1', poNumber: 'PO/2604/0015', supplierName: 'ABC Gold Refinery', totalPaise: 1200000_00, status: 'SENT', createdAt: '2026-04-03' },
    { id: '2', poNumber: 'PO/2604/0014', supplierName: 'Silver Craft Ltd', totalPaise: 450000_00, status: 'PARTIALLY_RECEIVED', createdAt: '2026-04-02' },
    { id: '3', poNumber: 'PO/2604/0013', supplierName: 'Gem Suppliers Inc', totalPaise: 780000_00, status: 'DRAFT', createdAt: '2026-04-01' },
  ],
  recentConsignmentsOut: [
    { id: '1', consignmentNumber: 'MEMO-OUT/2604/0008', customerName: 'Priya Jewellers', totalValuePaise: 850000_00, status: 'ISSUED', issuedAt: '2026-04-02' },
    { id: '2', consignmentNumber: 'MEMO-OUT/2604/0007', customerName: 'Gold Emporium', totalValuePaise: 1200000_00, status: 'PARTIALLY_RETURNED', issuedAt: '2026-03-28' },
  ],
};

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `\u20B9${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `\u20B9${(rupees / 1000).toFixed(1)}K`;
  return `\u20B9${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function WholesaleDashboardPage() {
  const d = dashboardData;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wholesale & Distribution"
        description="Purchase orders, consignment management, and supplier relationships."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Wholesale' }]}
        actions={
          <a
            href="/wholesale/purchase-orders"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <FileText className="h-4 w-4" />
            New Purchase Order
          </a>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending POs"
          value={String(d.pendingPOs + d.sentPOs)}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          title="Active Consignments"
          value={String(d.activeConsignmentsOut + d.activeConsignmentsIn)}
          icon={<Package className="h-4 w-4" />}
        />
        <StatCard
          title="Receivables"
          value={formatPaise(d.outstandingReceivablesPaise)}
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <StatCard
          title="Payables"
          value={formatPaise(d.outstandingPayablesPaise)}
          icon={<IndianRupee className="h-4 w-4" />}
        />
      </div>

      {/* Quick Actions + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Links */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Purchase Orders', count: d.pendingPOs + d.sentPOs, href: '/wholesale/purchase-orders', icon: FileText },
              { label: 'Goods Receipts', count: 0, href: '/wholesale/goods-receipts', icon: Package },
              { label: 'Outgoing Consignments', count: d.activeConsignmentsOut, href: '/wholesale/consignments-out', icon: Truck },
              { label: 'Incoming Consignments', count: d.activeConsignmentsIn, href: '/wholesale/consignments-in', icon: Truck },
              { label: 'Agents & Commissions', count: 0, href: '/wholesale/agents', icon: Users },
              { label: 'Outstanding & Credit', count: 0, href: '/wholesale/outstanding', icon: AlertTriangle },
              { label: 'Rate Contracts', count: 0, href: '/wholesale/rate-contracts', icon: FileText },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.count > 0 && (
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-medium">
                      {item.count}
                    </span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Upcoming Due Dates */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Upcoming Due Dates</h2>
          <div className="rounded-lg border divide-y">
            {d.upcomingDueDates.map((due) => (
              <div key={due.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium font-mono">{due.number}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{due.entityName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatPaise(due.valuePaise)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(due.dueDate)}</p>
                </div>
              </div>
            ))}
            {d.upcomingDueDates.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No upcoming due dates
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent POs</h2>
            <a href="/wholesale/purchase-orders" className="text-xs text-primary hover:underline">View All</a>
          </div>
          <div className="rounded-lg border divide-y">
            {d.recentPOs.map((po) => (
              <a
                key={po.id}
                href={`/wholesale/purchase-orders/${po.id}`}
                className="flex items-center justify-between p-3 transition-colors hover:bg-accent"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium font-mono">{po.poNumber}</span>
                    <StatusBadge
                      label={po.status.replace(/_/g, ' ')}
                      variant={getStatusVariant(po.status)}
                      dot={false}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{po.supplierName}</p>
                </div>
                <span className="text-sm font-semibold">{formatPaise(po.totalPaise)}</span>
              </a>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Consignments</h2>
            <a href="/wholesale/consignments-out" className="text-xs text-primary hover:underline">View All</a>
          </div>
          <div className="rounded-lg border divide-y">
            {d.recentConsignmentsOut.map((c) => (
              <a
                key={c.id}
                href={`/wholesale/consignments-out`}
                className="flex items-center justify-between p-3 transition-colors hover:bg-accent"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium font-mono">{c.consignmentNumber}</span>
                    <StatusBadge
                      label={c.status.replace(/_/g, ' ')}
                      variant={getStatusVariant(c.status)}
                      dot={false}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.customerName}</p>
                </div>
                <span className="text-sm font-semibold">{formatPaise(c.totalValuePaise)}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
