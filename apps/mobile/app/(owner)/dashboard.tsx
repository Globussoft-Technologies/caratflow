// ─── Owner Dashboard ──────────────────────────────────────────
// Wired to real tRPC routers. There is no single "ownerDashboard"
// procedure on the backend, so this screen aggregates from:
//   - reporting.getAnalyticsDashboard  (KPIs + alerts + daily trend)
//   - reporting.salesByLocation        (branch performance)
//   - reporting.lowStockAlert          (low stock count for the alert card)
//
// Numeric paise values arrive as strings from the API because the
// server serializes BigInt via a string transformer. MoneyDisplay /
// formatMoneyShort coerce via `/ 100` so they work as-is.

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/Card';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { formatMoneyShort } from '@/utils/money';
import { useAuthStore } from '@/store/auth-store';
import { trpc } from '@/lib/trpc';

interface AnalyticsKpi {
  label: string;
  value: number | string;
  formattedValue?: string;
}

interface AnalyticsChart {
  title: string;
  labels: string[];
  datasets: Array<{ label: string; data: Array<number | string> }>;
}

interface AnalyticsDashboard {
  kpis: AnalyticsKpi[];
  charts: AnalyticsChart[];
  alerts: Array<{ id: string; title: string; severity: string }>;
}

interface SalesByLocationRow {
  locationId: string;
  locationName: string;
  salesCount: number;
  totalRevenuePaise: number | string;
}

interface LowStockRow {
  productId: string;
}

/** Return [firstOfMonth, now] as Date pair. */
function currentMonthRange(): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return { from, to: now };
}

/** Coerce a possibly-stringified paise value from the wire. */
function asNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return 0;
}

export default function OwnerDashboardScreen() {
  const { user, activeLocationName } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const dateRange = useMemo(currentMonthRange, []);

  const analyticsQ = trpc.reporting.getAnalyticsDashboard.useQuery({
    dateRange,
  });
  const branchesQ = trpc.reporting.salesByLocation.useQuery({ dateRange });
  const lowStockQ = trpc.reporting.lowStockAlert.useQuery();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      analyticsQ.refetch(),
      branchesQ.refetch(),
      lowStockQ.refetch(),
    ]);
    setRefreshing(false);
  }, [analyticsQ, branchesQ, lowStockQ]);

  const analytics =
    (analyticsQ.data as unknown as AnalyticsDashboard | undefined) ?? {
      kpis: [],
      charts: [],
      alerts: [],
    };
  const branches = (
    (branchesQ.data as unknown as SalesByLocationRow[] | undefined) ?? []
  ).map((b) => ({
    id: b.locationId,
    name: b.locationName,
    todayRevenuePaise: asNumber(b.totalRevenuePaise),
    salesCount: b.salesCount,
  }));
  const lowStockCount = (
    (lowStockQ.data as unknown as LowStockRow[] | undefined) ?? []
  ).length;

  const kpiMap = new Map<string, AnalyticsKpi>();
  for (const k of analytics.kpis) kpiMap.set(k.label, k);
  const revenue = asNumber(kpiMap.get('Total Revenue')?.value ?? 0);
  const salesCount = asNumber(kpiMap.get('Sales Count')?.value ?? 0);
  const avgTicket = asNumber(kpiMap.get('Average Ticket')?.value ?? 0);

  // Build a simple 7-point trend from the revenue chart (last 7 days).
  const revenueChart = analytics.charts[0];
  const trend = revenueChart
    ? revenueChart.labels.slice(-7).map((d, i) => ({
        date: d,
        revenuePaise: asNumber(
          revenueChart.datasets[0]?.data[
            revenueChart.labels.length - 7 + i
          ] ?? 0,
        ),
      }))
    : [];

  const pendingApprovals = analytics.alerts.filter(
    (a) => a.severity === 'warning' || a.severity === 'critical',
  ).length;

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#d4af37']}
            tintColor="#d4af37"
          />
        }
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-sm text-surface-500">Welcome back,</Text>
          <Text className="text-2xl font-bold text-surface-900">
            {user?.firstName ?? 'Owner'}
          </Text>
          {activeLocationName && (
            <Text className="text-xs text-surface-400 mt-1">
              {activeLocationName}
            </Text>
          )}
        </View>

        {/* KPI Cards Row 1: MTD revenue + sales count */}
        <View className="flex-row gap-3 mb-3">
          <StatCard title="MTD Revenue" value={formatMoneyShort(revenue)} />
          <StatCard title="MTD Sales" value={String(salesCount)} />
        </View>

        {/* KPI Cards Row 2: avg ticket + branches */}
        <View className="flex-row gap-3 mb-3">
          <StatCard title="Avg Ticket" value={formatMoneyShort(avgTicket)} />
          <StatCard title="Branches" value={String(branches.length)} />
        </View>

        {/* Alert Cards */}
        <View className="flex-row gap-3 mb-6">
          <StatCard
            title="Low Stock"
            value={String(lowStockCount)}
            onPress={() => router.push('/(owner)/reports/inventory')}
          />
          <StatCard
            title="Pending Approvals"
            value={String(pendingApprovals)}
            onPress={() => router.push('/(owner)/approvals')}
          />
        </View>

        {/* Revenue Trend (simple bar representation) */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-3">
            Daily Revenue (Last 7 Days)
          </Text>
          {trend.length > 0 ? (
            <View className="flex-row items-end gap-1 h-24">
              {(() => {
                const maxRev = Math.max(
                  ...trend.map((d) => d.revenuePaise),
                  1,
                );
                return trend.map((day, idx) => {
                  const height = Math.max(
                    (day.revenuePaise / maxRev) * 80,
                    4,
                  );
                  const dayLabel = new Date(day.date).toLocaleDateString(
                    'en-IN',
                    { weekday: 'short' },
                  );
                  return (
                    <View key={idx} className="flex-1 items-center">
                      <View
                        className="w-full bg-primary-400 rounded-t"
                        style={{ height }}
                      />
                      <Text className="text-[9px] text-surface-500 mt-1">
                        {dayLabel}
                      </Text>
                    </View>
                  );
                });
              })()}
            </View>
          ) : (
            <Text className="text-surface-400 text-sm text-center py-4">
              No data available
            </Text>
          )}
        </Card>

        {/* Branch Comparison */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-3">
            Branch Performance (MTD)
          </Text>
          {branches.length > 0 ? (
            branches.map((branch) => (
              <View
                key={branch.id}
                className="flex-row items-center justify-between py-2.5 border-b border-surface-100 last:border-b-0"
              >
                <View>
                  <Text className="text-sm font-medium text-surface-800">
                    {branch.name}
                  </Text>
                  <Text className="text-xs text-surface-500">
                    {branch.salesCount} sales
                  </Text>
                </View>
                <MoneyDisplay
                  amountPaise={branch.todayRevenuePaise}
                  short
                  className="text-sm font-semibold text-surface-900"
                />
              </View>
            ))
          ) : (
            <Text className="text-surface-400 text-sm text-center py-4">
              No branch data
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
