'use client';

import { PageHeader, StatusBadge, getStatusVariant } from '@caratflow/ui';
import { Plus, Search, Filter } from 'lucide-react';
import { useState } from 'react';

const STATUSES = ['ALL', 'DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'CUSTOMS_CLEARED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

// Mock data
const orders = [
  { id: '1', orderNumber: 'EXP/CF/2604/0008', buyerName: 'Diamond Corp USA', buyerCountry: 'US', totalPaise: 5200000_00, status: 'SHIPPED', currencyCode: 'USD', incoterms: 'FOB', createdAt: '2026-04-02' },
  { id: '2', orderNumber: 'EXP/CF/2604/0007', buyerName: 'Al Maktoum Jewels', buyerCountry: 'AE', totalPaise: 3800000_00, status: 'CUSTOMS_CLEARED', currencyCode: 'AED', incoterms: 'CIF', createdAt: '2026-04-01' },
  { id: '3', orderNumber: 'EXP/CF/2604/0006', buyerName: 'London Gold Ltd', buyerCountry: 'GB', totalPaise: 2100000_00, status: 'CONFIRMED', currencyCode: 'GBP', incoterms: 'FOB', createdAt: '2026-03-30' },
  { id: '4', orderNumber: 'EXP/CF/2604/0005', buyerName: 'Singapore Gems Pte', buyerCountry: 'SG', totalPaise: 1500000_00, status: 'DRAFT', currencyCode: 'SGD', incoterms: 'EXW', createdAt: '2026-03-28' },
  { id: '5', orderNumber: 'EXP/CF/2604/0004', buyerName: 'Tokyo Precious Co', buyerCountry: 'JP', totalPaise: 4200000_00, status: 'DELIVERED', currencyCode: 'USD', incoterms: 'DDP', createdAt: '2026-03-25' },
];

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `\u20B9${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `\u20B9${(rupees / 1000).toFixed(1)}K`;
  return `\u20B9${rupees.toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ExportOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (searchQuery && !o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) && !o.buyerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export Orders"
        description="Manage and track all export orders."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Export', href: '/export' },
          { label: 'Orders' },
        ]}
        actions={
          <a
            href="/export/orders/new"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Export Order
          </a>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-accent'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders..."
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm sm:w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Order Number</th>
                <th className="px-4 py-3 text-left font-medium">Buyer</th>
                <th className="px-4 py-3 text-left font-medium">Country</th>
                <th className="px-4 py-3 text-left font-medium">Incoterms</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <a href={`/export/orders/${order.id}`} className="font-mono text-primary hover:underline">
                      {order.orderNumber}
                    </a>
                  </td>
                  <td className="px-4 py-3">{order.buyerName}</td>
                  <td className="px-4 py-3 font-mono">{order.buyerCountry}</td>
                  <td className="px-4 py-3 font-mono">{order.incoterms}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatPaise(order.totalPaise)}
                    <span className="ml-1 text-xs text-muted-foreground">{order.currencyCode}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={order.status.replace(/_/g, ' ')}
                      variant={getStatusVariant(order.status)}
                      dot={false}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No export orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
