import React, { useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DataList } from '@/components/DataList';
import { Card } from '@/components/Card';
import { Badge, getStatusVariant } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { SearchBar } from '@/components/SearchBar';
import { formatDate } from '@/utils/date';
import { useAuthStore } from '@/store/auth-store';
import { trpc } from '@/lib/trpc';

interface AgentOrder {
  id: string;
  poNumber: string;
  supplierName?: string;
  status: string;
  totalPaise: string | number;
  createdAt: string | Date;
  expectedDate: string | Date | null;
  items?: unknown[];
}

export default function AgentOrdersScreen() {
  const { user } = useAuthStore();
  const agentId = user?.id;
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = trpc.wholesale.purchaseOrders.list.useQuery(
    {
      createdByAgentId: agentId ?? '',
      filters: search ? { search } : undefined,
      pagination: { page: 1, limit: 50, sortOrder: 'desc' },
    },
    { enabled: !!agentId },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const orders = (data?.items ?? []) as AgentOrder[];

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-surface-900 mb-3">
          Orders
        </Text>
        <SearchBar
          placeholder="Search by PO number..."
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
        emptySubtitle="Orders you book will appear here"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => {
          const itemCount = Array.isArray(item.items) ? item.items.length : 0;
          return (
            <Card className="mb-2">
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-surface-900">
                    {item.poNumber}
                  </Text>
                  <Text className="text-xs text-surface-500">
                    {item.supplierName ?? 'Supplier'} | {itemCount} item{itemCount !== 1 ? 's' : ''}
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
                  amountPaise={Number(item.totalPaise)}
                  className="text-base font-bold text-surface-900"
                />
                <View className="items-end">
                  <Text className="text-xs text-surface-500">
                    {formatDate(String(item.createdAt))}
                  </Text>
                  {item.expectedDate && (
                    <Text className="text-xs text-surface-400">
                      ETA: {formatDate(String(item.expectedDate))}
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}
