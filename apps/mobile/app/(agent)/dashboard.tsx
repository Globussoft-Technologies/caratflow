import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/Card';
import { formatMoneyShort } from '@/utils/money';
import { useAuthStore } from '@/store/auth-store';
import { trpc } from '@/lib/trpc';

export default function AgentDashboardScreen() {
  const { user } = useAuthStore();
  const agentId = user?.id;
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch, isLoading } = trpc.wholesale.agentDashboard.useQuery(
    { agentId: agentId ?? '' },
    { enabled: !!agentId },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const dashboard = data ?? {
    collectionsThisMonthPaise: '0',
    outstandingForAssignedCustomersPaise: '0',
    visitsThisWeek: 0,
    ordersBookedThisMonth: 0,
  };

  // BigInt fields arrive as decimal strings from the tRPC transformer.
  const collectionsPaise = Number(dashboard.collectionsThisMonthPaise ?? 0);
  const outstandingPaise = Number(dashboard.outstandingForAssignedCustomersPaise ?? 0);

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
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

        <View className="flex-row gap-3 mb-3">
          <StatCard
            title="Collections"
            value={formatMoneyShort(collectionsPaise)}
            subtitle="this month"
          />
          <StatCard
            title="Outstanding"
            value={formatMoneyShort(outstandingPaise)}
            subtitle="assigned"
          />
        </View>

        <View className="flex-row gap-3 mb-3">
          <StatCard
            title="Visits"
            value={String(dashboard.visitsThisWeek)}
            subtitle="this week"
          />
          <StatCard
            title="Orders"
            value={String(dashboard.ordersBookedThisMonth)}
            subtitle="booked"
          />
        </View>

        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-2">
            Summary
          </Text>
          <Text className="text-xs text-surface-500">
            Showing activity for current month. Visits count for the current week
            (Mon-Sun). Outstanding is across customers you have engaged with.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
