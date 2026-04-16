import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { formatDate } from '@/utils/date';

/**
 * Passbook
 * ------------------------------------------------------------------
 * Real customerPortal dashboard: loyalty balance + scheme memberships
 * + recent orders. The previous REST endpoint (/crm/customer-passbook)
 * never existed on the server.
 */
export default function PassbookScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const dashboard = trpc.customerPortal.dashboard.useQuery();
  const schemes = trpc.customerPortal.schemes.list.useQuery();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([dashboard.refetch(), schemes.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [dashboard, schemes]);

  const dash = dashboard.data;
  const schemeList = schemes.data?.activeSchemes ?? [];
  const recentOrders = dash?.recentOrders ?? [];
  const isLoading = dashboard.isLoading || schemes.isLoading;

  if (isLoading && !dash) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#d4af37" />
          <Text className="mt-3 text-surface-500 text-sm">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text className="text-2xl font-bold text-surface-900 mb-4">Passbook</Text>

        {/* Loyalty Summary */}
        <Card
          className="mb-4"
          onPress={() => router.push('/(customer)/passbook/loyalty' as never)}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs text-surface-500">Loyalty Points</Text>
              <Text className="text-2xl font-bold text-primary-500">
                {dash?.loyalty?.currentPoints ?? 0}
              </Text>
            </View>
            {dash?.loyalty?.tier && (
              <Badge label={dash.loyalty.tier} variant="gold" size="md" />
            )}
          </View>
          {dash?.loyalty?.pointsExpiringSoon ? (
            <Text className="text-xs text-amber-600 mt-1">
              {dash.loyalty.pointsExpiringSoon} pts expiring soon
            </Text>
          ) : (
            <Text className="text-xs text-primary-400 mt-1">
              Tap to view details and history
            </Text>
          )}
        </Card>

        {/* Active Schemes */}
        <Text className="text-sm font-semibold text-surface-700 mb-2">
          My Schemes ({schemeList.length})
        </Text>
        {schemeList.map((scheme) => {
          const progress =
            scheme.totalInstallments > 0
              ? (scheme.paidInstallments / scheme.totalInstallments) * 100
              : 0;
          return (
            <Card
              key={scheme.id}
              className="mb-3"
              onPress={() =>
                router.push(
                  `/(customer)/passbook/scheme/${scheme.id}` as never,
                )
              }
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-semibold text-surface-900">
                  {scheme.schemeName}
                </Text>
                <Badge
                  label={scheme.schemeType.replace('_', ' ')}
                  variant="info"
                  size="sm"
                />
              </View>

              {/* Progress Bar */}
              <View className="h-2 bg-surface-200 rounded-full mb-2">
                <View
                  className="h-2 bg-primary-400 rounded-full"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </View>

              <View className="flex-row justify-between">
                <Text className="text-xs text-surface-500">
                  {scheme.paidInstallments}/{scheme.totalInstallments}{' '}
                  installments
                </Text>
                <MoneyDisplay
                  amountPaise={Number(scheme.totalPaidPaise)}
                  short
                  className="text-xs font-medium text-surface-700"
                />
              </View>
              {scheme.nextDueDate && (
                <Text className="text-xs text-amber-600 mt-1">
                  Next due: {formatDate(scheme.nextDueDate)}
                </Text>
              )}
            </Card>
          );
        })}
        {schemeList.length === 0 && (
          <Card className="mb-4">
            <Text className="text-sm text-surface-400 text-center py-3">
              No active schemes. Ask your jeweler about savings plans.
            </Text>
          </Card>
        )}

        {/* Recent Orders */}
        <Text className="text-sm font-semibold text-surface-700 mb-2 mt-2">
          Recent Orders
        </Text>
        {recentOrders.map((order) => (
          <Card key={order.id} className="mb-2">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-medium text-surface-800">
                  {order.orderNumber}
                </Text>
                <Text className="text-xs text-surface-500">
                  {order.placedAt
                    ? formatDate(order.placedAt)
                    : formatDate(order.createdAt)}{' '}
                  | {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
                </Text>
              </View>
              <View className="items-end">
                <MoneyDisplay
                  amountPaise={Number(order.totalPaise)}
                  className="text-sm font-semibold text-surface-900"
                />
                <Badge label={order.status} variant="info" size="sm" />
              </View>
            </View>
          </Card>
        ))}
        {recentOrders.length === 0 && (
          <Card className="mb-4">
            <Text className="text-sm text-surface-400 text-center py-3">
              No purchases yet
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
