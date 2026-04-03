'use client';

import { cn } from '@caratflow/ui';
import { Star, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  completedOrders: number;
  onTimeDeliveryPercent: number;
  qualityRejectionPercent: number;
  priceCompliancePercent: number;
  averageLeadTimeDays: number;
  totalPurchaseValuePaise: number;
}

interface SupplierPerformanceCardProps {
  performance: SupplierPerformance;
  className?: string;
}

function formatPaise(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100000) return `\u20B9${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `\u20B9${(rupees / 1000).toFixed(1)}K`;
  return `\u20B9${rupees.toLocaleString('en-IN')}`;
}

function getRatingColor(percent: number): string {
  if (percent >= 90) return 'text-emerald-600';
  if (percent >= 75) return 'text-amber-600';
  return 'text-red-600';
}

function getBarColor(percent: number): string {
  if (percent >= 90) return 'bg-emerald-500';
  if (percent >= 75) return 'bg-amber-500';
  return 'bg-red-500';
}

export function SupplierPerformanceCard({ performance, className }: SupplierPerformanceCardProps) {
  const p = performance;
  const overallScore = Math.round(
    (p.onTimeDeliveryPercent + (100 - p.qualityRejectionPercent) + p.priceCompliancePercent) / 3,
  );

  return (
    <div className={cn('rounded-lg border p-4 space-y-3 transition-colors hover:bg-accent/50', className)}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold">{p.supplierName}</h3>
          <p className="text-xs text-muted-foreground">
            {p.completedOrders}/{p.totalOrders} orders completed
          </p>
        </div>
        <div className={cn('flex items-center gap-1 text-lg font-bold', getRatingColor(overallScore))}>
          <Star className="h-4 w-4" />
          {overallScore}%
        </div>
      </div>

      <div className="space-y-2">
        {[
          { label: 'On-Time Delivery', value: p.onTimeDeliveryPercent, icon: Clock },
          { label: 'Quality (Low Rejection)', value: 100 - p.qualityRejectionPercent, icon: TrendingUp },
          { label: 'Price Compliance', value: p.priceCompliancePercent, icon: AlertTriangle },
        ].map((metric) => (
          <div key={metric.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{metric.label}</span>
              <span className={cn('font-medium', getRatingColor(metric.value))}>{metric.value}%</span>
            </div>
            <div className="mt-0.5 h-1.5 rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full', getBarColor(metric.value))}
                style={{ width: `${metric.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 border-t text-xs text-muted-foreground">
        <span>Avg. Lead Time: {p.averageLeadTimeDays} days</span>
        <span>Total: {formatPaise(p.totalPurchaseValuePaise)}</span>
      </div>
    </div>
  );
}
