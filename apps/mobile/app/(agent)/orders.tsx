import React, { useState, useCallback } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApiQuery } from '@/hooks/useApi';
import { DataList } from '@/components/DataList';
import { Card } from '@/components/Card';
import { Badge, getStatusVariant } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { SearchBar } from '@/components/SearchBar';
import { formatDate } from '@/utils/date';
import { useAuthStore } from '@/store/auth-store';

interface AgentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalPaise: number;
  itemCount: number;
  createdAt: string;
  expectedDelivery: string | null;
}

export default function AgentOrdersScreen() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useApiQuery<{
    items: AgentOrder[];
    total: number;
  }>(
    ['agent', 'orders', user?.id, search],
    '/api/v1/wholesale/agent-orders',
    { agentId: user?.id, search: search || undefined, limit: 50 },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const orders = data?.items ?? [];

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-surface-900 mb-3">
          Orders
        </Text>
        <SearchBar
          placeholder="Search orders..."
          onSearch={setSearch}
        />
      </View>

      <DataList
        data={orders}
        keyExtractor={(item) => item.id}
        loading={isLoading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        emptyTitle="No orders found"
        emptySubtitle="Orders placed through you will appear here"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <Card className="mb-2">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-surface-900">
                  {item.orderNumber}
                </Text>
                <Text className="text-xs text-surface-500">
                  {item.customerName} | {item.itemCount} items
                </Text>
              </View>
              <Badge
                label={item.status.replace('_', ' ')}
                variant={getStatusVariant(item.status)}
                size="sm"
              />
            </View>

            <View className="flex-row items-center justify-between">
              <MoneyDisplay
                amountPaise={item.totalPaise}
                className="text-base font-bold text-surface-900"
              />
              <View className="items-end">
                <Text className="text-xs text-surface-500">
                  {formatDate(item.createdAt)}
                </Text>
                {item.expectedDelivery && (
                  <Text className="text-xs text-surface-400">
                    ETA: {formatDate(item.expectedDelivery)}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
