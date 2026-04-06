'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Search, Filter, Clock, CheckCircle, Package, XCircle, Factory, ShoppingBag } from 'lucide-react';

// Mock data -- in production from tRPC: preorder.listPreOrders + preorder.getStats
const stats = {
  totalPending: 12,
  totalConfirmed: 8,
  totalInProduction: 5,
  totalAvailable: 3,
  totalFulfilled: 45,
  totalCancelled: 4,
  totalDepositPaise: 1250000_00,
};

const preOrders = [
  { id: '1', customerName: 'Meera Joshi', productName: '22K Gold Necklace Set', quantity: 1, status: 'PENDING', orderType: 'PRE_ORDER', depositPaise: 25000_00, estimatedAvailableDate: '2026-04-21', createdAt: '2026-04-04T11:00:00Z' },
  { id: '2', customerName: 'Vikram Singh', productName: 'Diamond Solitaire Ring', quantity: 1, status: 'CONFIRMED', orderType: 'MADE_TO_ORDER', depositPaise: 50000_00, estimatedAvailableDate: '2026-04-28', createdAt: '2026-04-03T09:30:00Z' },
  { id: '3', customerName: 'Ananya Reddy', productName: 'Platinum Wedding Bands (Pair)', quantity: 2, status: 'IN_PRODUCTION', orderType: 'MADE_TO_ORDER', depositPaise: 35000_00, estimatedAvailableDate: '2026-04-18', createdAt: '2026-04-01T16:00:00Z' },
  { id: '4', customerName: 'Pooja Gupta', productName: 'Ruby Stud Earrings', quantity: 1, status: 'AVAILABLE', orderType: 'BACKORDER', depositPaise: 10000_00, estimatedAvailableDate: '2026-04-07', createdAt: '2026-03-25T12:00:00Z' },
  { id: '5', customerName: 'Rahul Patel', productName: '18K Gold Chain', quantity: 1, status: 'FULFILLED', orderType: 'PRE_ORDER', depositPaise: 15000_00, estimatedAvailableDate: '2026-04-01', createdAt: '2026-03-20T10:00:00Z' },
  { id: '6', customerName: 'Deepa Nair', productName: 'Silver Anklet Set', quantity: 3, status: 'CANCELLED', orderType: 'BACKORDER', depositPaise: 0, estimatedAvailableDate: '2026-04-15', createdAt: '2026-03-28T14:00:00Z' },
];

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `\u20B9${rupees.toLocaleString('en-IN')}`;
}

function getOrderTypeBadge(type: string) {
  const styles: Record<string, string> = {
    PRE_ORDER: 'bg-blue-100 text-blue-700',
    BACKORDER: 'bg-amber-100 text-amber-700',
    MADE_TO_ORDER: 'bg-purple-100 text-purple-700',
  };
  const labels: Record<string, string> = {
    PRE_ORDER: 'Pre-Order',
    BACKORDER: 'Backorder',
    MADE_TO_ORDER: 'Made to Order',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[type] ?? 'bg-gray-100 text-gray-700'}`}>
      {labels[type] ?? type}
    </span>
  );
}

export default function PreOrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pre-Orders & Backorders"
        description="Manage pre-orders, backorders, and made-to-order requests."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'Pre-Orders' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <a
              href="/ecommerce/preorders/config"
              className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              Configuration
            </a>
            <button className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent">
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalPending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalConfirmed}</p>
              <p className="text-xs text-muted-foreground">Confirmed</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Factory className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalInProduction}</p>
              <p className="text-xs text-muted-foreground">In Production</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalAvailable}</p>
              <p className="text-xs text-muted-foreground">Ready to Fulfill</p>
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Summary */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Deposits Collected</p>
            <p className="text-2xl font-bold">{formatPaise(stats.totalDepositPaise)}</p>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <p className="font-semibold text-green-600">{stats.totalFulfilled}</p>
              <p className="text-xs text-muted-foreground">Fulfilled</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-red-600">{stats.totalCancelled}</p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['All', 'PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'AVAILABLE', 'FULFILLED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            className="inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors hover:bg-accent whitespace-nowrap"
          >
            {status === 'All' ? 'All Pre-Orders' : status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by customer name or product..."
          className="h-10 w-full rounded-md border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Pre-Orders Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Customer</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Product</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Qty</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="p-3 text-right text-xs font-medium text-muted-foreground uppercase">Deposit</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Est. Available</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {preOrders.map((po) => (
              <tr key={po.id} className="transition-colors hover:bg-accent/50">
                <td className="p-3">
                  <p className="text-sm font-medium">{po.customerName}</p>
                </td>
                <td className="p-3">
                  <a href={`/ecommerce/preorders/${po.id}`} className="text-sm font-medium hover:underline">
                    {po.productName}
                  </a>
                </td>
                <td className="p-3">
                  {getOrderTypeBadge(po.orderType)}
                </td>
                <td className="p-3">
                  <span className="text-sm">{po.quantity}</span>
                </td>
                <td className="p-3">
                  <StatusBadge
                    label={po.status.replace(/_/g, ' ')}
                    variant={getStatusVariant(po.status)}
                    dot={false}
                  />
                </td>
                <td className="p-3 text-right">
                  <span className="text-sm font-semibold">
                    {po.depositPaise > 0 ? formatPaise(po.depositPaise) : '--'}
                  </span>
                </td>
                <td className="p-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(po.estimatedAvailableDate).toLocaleDateString()}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    {po.status === 'PENDING' && (
                      <button className="inline-flex h-7 items-center rounded border px-2 text-xs font-medium hover:bg-accent" title="Confirm">
                        <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                      </button>
                    )}
                    {['CONFIRMED', 'IN_PRODUCTION'].includes(po.status) && (
                      <button className="inline-flex h-7 items-center rounded border px-2 text-xs font-medium hover:bg-accent" title="Mark Available">
                        <Package className="h-3.5 w-3.5 text-green-600" />
                      </button>
                    )}
                    {po.status === 'AVAILABLE' && (
                      <button className="inline-flex h-7 items-center rounded border px-2 text-xs font-medium hover:bg-accent" title="Fulfill">
                        <ShoppingBag className="h-3.5 w-3.5 text-green-600" />
                      </button>
                    )}
                    {!['FULFILLED', 'CANCELLED'].includes(po.status) && (
                      <button className="inline-flex h-7 items-center rounded border border-destructive/30 px-2 text-xs font-medium hover:bg-destructive/10" title="Cancel">
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
