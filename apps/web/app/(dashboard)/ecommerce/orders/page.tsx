'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Search, Filter } from 'lucide-react';
import { ChannelBadge } from '@/features/ecommerce';

// Mock data -- in production from tRPC: ecommerce.listOrders
const orders = [
  { id: '1', orderNumber: 'ON/SHO/2604/0028', channelType: 'SHOPIFY', customerName: 'Meera Joshi', customerEmail: 'meera@example.com', status: 'CONFIRMED', totalPaise: 125000_00, currencyCode: 'INR', placedAt: '2026-04-04T11:00:00Z', itemCount: 2 },
  { id: '2', orderNumber: 'ON/AMA/2604/0006', channelType: 'AMAZON', customerName: 'Vikram Singh', customerEmail: 'vikram@example.com', status: 'PROCESSING', totalPaise: 85000_00, currencyCode: 'INR', placedAt: '2026-04-04T09:30:00Z', itemCount: 1 },
  { id: '3', orderNumber: 'ON/SHO/2604/0027', channelType: 'SHOPIFY', customerName: 'Ananya Reddy', customerEmail: 'ananya@example.com', status: 'SHIPPED', totalPaise: 250000_00, currencyCode: 'INR', placedAt: '2026-04-03T16:00:00Z', itemCount: 3 },
  { id: '4', orderNumber: 'ON/INS/2604/0004', channelType: 'INSTAGRAM', customerName: 'Pooja Gupta', customerEmail: 'pooja@example.com', status: 'PENDING', totalPaise: 45000_00, currencyCode: 'INR', placedAt: '2026-04-04T12:00:00Z', itemCount: 1 },
  { id: '5', orderNumber: 'ON/SHO/2604/0026', channelType: 'SHOPIFY', customerName: 'Rahul Patel', customerEmail: 'rahul@example.com', status: 'DELIVERED', totalPaise: 175000_00, currencyCode: 'INR', placedAt: '2026-04-01T10:00:00Z', itemCount: 2 },
  { id: '6', orderNumber: 'ON/AMA/2604/0005', channelType: 'AMAZON', customerName: 'Deepa Nair', customerEmail: 'deepa@example.com', status: 'CANCELLED', totalPaise: 65000_00, currencyCode: 'INR', placedAt: '2026-04-02T14:00:00Z', itemCount: 1 },
];

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return `\u20B9${rupees.toLocaleString('en-IN')}`;
}

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Online Orders"
        description="Manage orders received from all sales channels."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'Orders' },
        ]}
        actions={
          <button className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        }
      />

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['All', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            className="inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors hover:bg-accent whitespace-nowrap"
          >
            {status === 'All' ? 'All Orders' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by order number, customer name, or email..."
          className="h-10 w-full rounded-md border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Orders Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Order</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Channel</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Customer</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Items</th>
              <th className="p-3 text-right text-xs font-medium text-muted-foreground uppercase">Total</th>
              <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-accent/50">
                <td className="p-3">
                  <a href={`/ecommerce/orders/${order.id}`} className="text-sm font-medium font-mono hover:underline">
                    {order.orderNumber}
                  </a>
                </td>
                <td className="p-3">
                  <ChannelBadge channelType={order.channelType} />
                </td>
                <td className="p-3">
                  <div>
                    <p className="text-sm font-medium">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                  </div>
                </td>
                <td className="p-3">
                  <StatusBadge
                    label={order.status.replace('_', ' ')}
                    variant={getStatusVariant(order.status)}
                    dot={false}
                  />
                </td>
                <td className="p-3">
                  <span className="text-sm">{order.itemCount}</span>
                </td>
                <td className="p-3 text-right">
                  <span className="text-sm font-semibold">{formatPaise(order.totalPaise)}</span>
                </td>
                <td className="p-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(order.placedAt).toLocaleDateString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
