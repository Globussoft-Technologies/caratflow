import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApiQuery } from '@/hooks/useApi';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/Card';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { formatMoneyShort } from '@/utils/money';
import { useAuthStore } from '@/store/auth-store';

interface AgentDashboard {
  collectionsThisMonthPaise: number;
  visitsCompleted: number;
  visitsTarget: number;
  ordersPlaced: number;
  commissionEarnedPaise: number;
  collectionRate: number; // percentage
  weeklyActivity: Array<{
    date: string;
    visits: number;
    collections: number;
  }>;
}

export default function AgentDashboardScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useApiQuery<AgentDashboard>(
    ['agent', 'dashboard', user?.id],
    '/api/v1/reporting/agent-dashboard',
    { agentId: user?.id },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const dashboard = data ?? {
    collectionsThisMonthPaise: 0,
    visitsCompleted: 0,
    visitsTarget: 0,
    ordersPlaced: 0,
    commissionEarnedPaise: 0,
    collectionRate: 0,
    weeklyActivity: [],
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
        <Text className="text-2xl font-bold text-surface-900 mb-1">
          My Dashboard
        </Text>
        <Text className="text-sm text-surface-500 mb-4">
          This month's performance
        </Text>

        {/* Key Metrics */}
        <View className="flex-row gap-3 mb-3">
          <StatCard
            title="Collections"
            value={formatMoneyShort(dashboard.collectionsThisMonthPaise)}
          />
          <StatCard
            title="Commission"
            value={formatMoneyShort(dashboard.commissionEarnedPaise)}
          />
        </View>

        <View className="flex-row gap-3 mb-3">
          <StatCard
            title="Visits"
            value={`${dashboard.visitsCompleted}/${dashboard.visitsTarget}`}
            subtitle="completed"
          />
          <StatCard
            title="Orders"
            value={String(dashboard.ordersPlaced)}
            subtitle="placed"
          />
        </View>

        {/* Collection Rate */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-2">
            Collection Rate
          </Text>
          <View className="h-3 bg-surface-200 rounded-full mb-1">
            <View
              className="h-3 bg-green-500 rounded-full"
              style={{
                width: `${Math.min(dashboard.collectionRate, 100)}%`,
              }}
            />
          </View>
          <Text className="text-xs text-surface-500 text-right">
            {dashboard.collectionRate.toFixed(1)}%
          </Text>
        </Card>

        {/* Weekly Activity */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-3">
            Weekly Activity
          </Text>
          {dashboard.weeklyActivity.length > 0 ? (
            dashboard.weeklyActivity.map((day, idx) => {
              const dayLabel = new Date(day.date).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
              });
              return (
                <View
                  key={idx}
                  className="flex-row items-center justify-between py-2 border-b border-surface-100"
                >
                  <Text className="text-sm text-surface-700 w-16">
                    {dayLabel}
                  </Text>
                  <View className="flex-row gap-4">
                    <Text className="text-xs text-surface-500">
                      {day.visits} visits
                    </Text>
                    <Text className="text-xs text-surface-500">
                      {day.collections} collections
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text className="text-sm text-surface-400 text-center py-4">
              No activity data available
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
