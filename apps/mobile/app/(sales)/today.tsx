import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/Card';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { Badge, getStatusVariant } from '@/components/Badge';
import { formatTime } from '@/utils/date';
import { formatMoneyShort, formatMoney } from '@/utils/money';
import { trpc } from '@/lib/trpc';

interface TodaySummary {
  mySalesCount: number;
  myRevenuePaise: number;
  goldRatePer10g: number;
  silverRatePer10g: number;
  pendingRepairs: Array<{
    id: string;
    repairNumber: string;
    customerName: string;
    status: string;
    itemDescription: string;
  }>;
  recentTransactions: Array<{
    id: string;
    saleNumber: string;
    customerName: string | null;
    totalPaise: number;
    createdAt: string;
  }>;
}

export default function TodayScreen() {
  const [refreshing, setRefreshing] = useState(false);

  // retail.staffDashboard aggregates sales for the logged-in user
  // (derived from ctx.userId on the server) plus pending repairs,
  // recent transactions, and today's gold/silver rates.
  const { data, refetch } = trpc.retail.staffDashboard.useQuery(undefined);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const raw = data as unknown as TodaySummary | undefined;
  const summary: TodaySummary = raw ?? {
    mySalesCount: 0,
    myRevenuePaise: 0,
    goldRatePer10g: 0,
    silverRatePer10g: 0,
    pendingRepairs: [],
    recentTransactions: [],
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
        <Text className="text-2xl font-bold text-surface-900 mb-4">
          Today
        </Text>

        {/* My Performance */}
        <View className="flex-row gap-3 mb-4">
          <StatCard
            title="My Sales"
            value={String(summary.mySalesCount)}
          />
          <StatCard
            title="My Revenue"
            value={formatMoneyShort(summary.myRevenuePaise)}
          />
        </View>

        {/* Today's Rates */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-2">
            Today's Rates (per 10g)
          </Text>
          <View className="flex-row justify-between py-1">
            <Text className="text-sm text-surface-600">Gold</Text>
            <Text className="text-sm font-semibold text-primary-500">
              {summary.goldRatePer10g > 0
                ? formatMoney(summary.goldRatePer10g)
                : 'Not set'}
            </Text>
          </View>
          <View className="flex-row justify-between py-1">
            <Text className="text-sm text-surface-600">Silver</Text>
            <Text className="text-sm font-semibold text-surface-700">
              {summary.silverRatePer10g > 0
                ? formatMoney(summary.silverRatePer10g)
                : 'Not set'}
            </Text>
          </View>
        </Card>

        {/* Pending Repairs */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-2">
            Assigned Repairs ({summary.pendingRepairs.length})
          </Text>
          {summary.pendingRepairs.map((repair) => (
            <View
              key={repair.id}
              className="py-2.5 border-b border-surface-100"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-surface-800">
                  {repair.repairNumber}
                </Text>
                <Badge
                  label={repair.status}
                  variant={getStatusVariant(repair.status)}
                  size="sm"
                />
              </View>
              <Text className="text-xs text-surface-500 mt-0.5">
                {repair.customerName} - {repair.itemDescription}
              </Text>
            </View>
          ))}
          {summary.pendingRepairs.length === 0 && (
            <Text className="text-sm text-surface-400 text-center py-3">
              No repairs assigned
            </Text>
          )}
        </Card>

        {/* Recent Transactions */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-2">
            Recent Transactions
          </Text>
          {summary.recentTransactions.map((tx) => (
            <View
              key={tx.id}
              className="flex-row items-center justify-between py-2.5 border-b border-surface-100"
            >
              <View>
                <Text className="text-sm font-medium text-surface-800">
                  {tx.saleNumber}
                </Text>
                <Text className="text-xs text-surface-500">
                  {tx.customerName ?? 'Walk-in'} | {formatTime(tx.createdAt)}
                </Text>
              </View>
              <MoneyDisplay
                amountPaise={tx.totalPaise}
                className="text-sm font-semibold text-surface-900"
              />
            </View>
          ))}
          {summary.recentTransactions.length === 0 && (
            <Text className="text-sm text-surface-400 text-center py-3">
              No transactions yet today
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
