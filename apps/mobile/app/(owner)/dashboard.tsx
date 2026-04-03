import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useApiQuery } from '@/hooks/useApi';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { formatMoneyShort } from '@/utils/money';
import { useAuthStore } from '@/store/auth-store';

interface OwnerDashboardData {
  todayRevenuePaise: number;
  mtdRevenuePaise: number;
  activeOrders: number;
  stockValuePaise: number;
  lowStockCount: number;
  pendingApprovals: number;
  dailyRevenueTrend: Array<{ date: string; revenuePaise: number }>;
  branches: Array<{
    id: string;
    name: string;
    todayRevenuePaise: number;
    salesCount: number;
  }>;
}

export default function OwnerDashboardScreen() {
  const { user, activeLocationName } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useApiQuery<OwnerDashboardData>(
    ['owner', 'dashboard'],
    '/api/v1/reporting/owner-dashboard',
    undefined,
    { offlineCacheMs: 5 * 60 * 1000 },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const dashboard = data ?? {
    todayRevenuePaise: 0,
    mtdRevenuePaise: 0,
    activeOrders: 0,
    stockValuePaise: 0,
    lowStockCount: 0,
    pendingApprovals: 0,
    dailyRevenueTrend: [],
    branches: [],
  };

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
          <Text className="text-sm text-surface-500">
            Welcome back,
          </Text>
          <Text className="text-2xl font-bold text-surface-900">
            {user?.firstName ?? 'Owner'}
          </Text>
          {activeLocationName && (
            <Text className="text-xs text-surface-400 mt-1">
              {activeLocationName}
            </Text>
          )}
        </View>

        {/* KPI Cards Row 1 */}
        <View className="flex-row gap-3 mb-3">
          <StatCard
            title="Today's Revenue"
            value={formatMoneyShort(dashboard.todayRevenuePaise)}
          />
          <StatCard
            title="MTD Revenue"
            value={formatMoneyShort(dashboard.mtdRevenuePaise)}
          />
        </View>

        {/* KPI Cards Row 2 */}
        <View className="flex-row gap-3 mb-3">
          <StatCard
            title="Active Orders"
            value={String(dashboard.activeOrders)}
          />
          <StatCard
            title="Stock Value"
            value={formatMoneyShort(dashboard.stockValuePaise)}
          />
        </View>

        {/* Alert Cards */}
        <View className="flex-row gap-3 mb-6">
          <StatCard
            title="Low Stock"
            value={String(dashboard.lowStockCount)}
            onPress={() => {}}
          />
          <StatCard
            title="Pending Approvals"
            value={String(dashboard.pendingApprovals)}
            onPress={() => router.push('/(owner)/approvals')}
          />
        </View>

        {/* Revenue Trend (simple bar representation) */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-3">
            Daily Revenue (Last 7 Days)
          </Text>
          {dashboard.dailyRevenueTrend.length > 0 ? (
            <View className="flex-row items-end gap-1 h-24">
              {(() => {
                const maxRev = Math.max(
                  ...dashboard.dailyRevenueTrend.map((d) => d.revenuePaise),
                  1,
                );
                return dashboard.dailyRevenueTrend.map((day, idx) => {
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
            Branch Performance
          </Text>
          {dashboard.branches.length > 0 ? (
            dashboard.branches.map((branch) => (
              <View
                key={branch.id}
                className="flex-row items-center justify-between py-2.5 border-b border-surface-100 last:border-b-0"
              >
                <View>
                  <Text className="text-sm font-medium text-surface-800">
                    {branch.name}
                  </Text>
                  <Text className="text-xs text-surface-500">
                    {branch.salesCount} sales today
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
