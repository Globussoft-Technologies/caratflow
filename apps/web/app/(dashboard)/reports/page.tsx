'use client';

import * as React from 'react';
import Link from 'next/link';
import { PageHeader } from '@caratflow/ui';
import {
  ShoppingCart,
  Package,
  Factory,
  Users,
  IndianRupee,
  Wrench,
  TrendingUp,
  Clock,
  Star,
  BarChart3,
} from 'lucide-react';

const REPORT_CATEGORIES = [
  {
    title: 'Sales Analytics',
    description: 'Daily summaries, product performance, salesperson rankings, location comparison.',
    href: '/reports/sales',
    icon: ShoppingCart,
    color: 'bg-green-500/10 text-green-600',
  },
  {
    title: 'Inventory Reports',
    description: 'Stock summary, low stock alerts, dead stock, aging analysis, valuation.',
    href: '/reports/inventory',
    icon: Package,
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    title: 'Manufacturing',
    description: 'Job summary, karigar performance, material usage, wastage, cost analysis.',
    href: '/reports/manufacturing',
    icon: Factory,
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    title: 'Customer Analytics',
    description: 'Acquisition, retention, lifetime value, loyalty metrics, lead funnel.',
    href: '/reports/crm',
    icon: Users,
    color: 'bg-orange-500/10 text-orange-600',
  },
  {
    title: 'Custom Reports',
    description: 'Build reports with any entity, custom columns, filters, and aggregations.',
    href: '/reports/custom',
    icon: Wrench,
    color: 'bg-cyan-500/10 text-cyan-600',
  },
  {
    title: 'Demand Forecasting',
    description: 'Sales predictions, reorder points, seasonality analysis.',
    href: '/reports/forecast',
    icon: TrendingUp,
    color: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    title: 'Scheduled Reports',
    description: 'Automated report delivery via email. PDF, Excel, or CSV.',
    href: '/reports/scheduled',
    icon: Clock,
    color: 'bg-amber-500/10 text-amber-600',
  },
] as const;

export default function ReportsHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Business intelligence, financial reports, and data exports."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports' },
        ]}
      />

      {/* Report Category Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.href}
              href={category.href}
              className="group rounded-lg border bg-card p-6 hover:border-primary/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 rounded-lg p-3 ${category.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {category.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent / Favorite Reports */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold">Favorite Reports</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Save reports from any category to access them quickly here.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Recent Reports</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Your recently viewed reports will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
