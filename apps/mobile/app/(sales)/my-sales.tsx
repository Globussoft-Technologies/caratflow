// ─── My Sales ────────────────────────────────────────────────────
// List of sales the logged-in staff member has rung up. Filterable
// by date range. Tapping a row opens the receipt detail.

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card } from '@/components/Card';
import { DataList } from '@/components/DataList';
import { Badge, getStatusVariant } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { StatCard } from '@/components/StatCard';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth-store';
import { formatDate, formatTime } from '@/utils/date';
import { formatMoneyShort } from '@/utils/money';

interface MySaleListItem {
  id: string;
  saleNumber: string;
  invoiceNumber: string | null;
  customerName: string | null;
  totalPaise: number;
  itemCount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

type RangeKey = 'today' | '7d' | '30d' | 'all';

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: 'today', label: 'Today', days: 0 },
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: 'all', label: 'All', days: null },
];

function rangeToDates(range: RangeKey): {
  fromDate?: string;
  toDate?: string;
} {
  if (range === 'all') return {};
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  if (range === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (range === '7d') {
    from.setDate(from.getDate() - 7);
    from.setHours(0, 0, 0, 0);
  } else if (range === '30d') {
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
  }
  return { fromDate: from.toISOString(), toDate: to.toISOString() };
}

export default function MySalesScreen() {
  const { user } = useAuthStore();
  const [range, setRange] = useState<RangeKey>('today');
  const [refreshing, setRefreshing] = useState(false);

  const params = useMemo(() => rangeToDates(range), [range]);

  // tRPC retail.listSales: filters.userId = the staff member who rang up the sale.
  // SaleListFilterSchema does not include a `staffUserId` alias — we use `userId`.
  const { data, isLoading, refetch } = trpc.retail.listSales.useQuery(
    {
      filters: {
        userId: user?.id,
        dateFrom: params.fromDate ? new Date(params.fromDate) : undefined,
        dateTo: params.toDate ? new Date(params.toDate) : undefined,
      },
      pagination: {
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
    },
    { enabled: !!user?.id },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const listData = data as
    | { items?: MySaleListItem[]; total?: number; totalPaise?: number }
    | undefined;
  const items = (listData?.items ?? []) as MySaleListItem[];
  const totalCount = listData?.total ?? items.length;
  const totalRevenue =
    listData?.totalPaise ?? items.reduce((s, i) => s + i.totalPaise, 0);

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-surface-900 mb-3">
          My Sales
        </Text>

        {/* Range chips */}
        <View className="flex-row gap-2 mb-3">
          {RANGES.map((r) => (
            <Pressable
              key={r.key}
              onPress={() => setRange(r.key)}
              className={`flex-1 py-2 rounded-lg items-center ${
                range === r.key
                  ? 'bg-primary-100 border border-primary-400'
                  : 'bg-surface-200'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  range === r.key ? 'text-primary-700' : 'text-surface-700'
                }`}
              >
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row gap-3 mb-2">
          <StatCard title="Sales" value={String(totalCount)} />
          <StatCard
            title="Revenue"
            value={formatMoneyShort(totalRevenue)}
          />
        </View>
      </View>

      <DataList
        data={items}
        keyExtractor={(item) => item.id}
        loading={isLoading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        emptyTitle="No sales in this range"
        emptySubtitle="Try a wider date range"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Card
            className="mb-2"
            onPress={() =>
              router.push(`/(sales)/my-sales/${item.id}` as never)
            }
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-sm font-semibold text-surface-900">
                  {item.invoiceNumber ?? item.saleNumber}
                </Text>
                <Text className="text-xs text-surface-500 mt-0.5">
                  {item.customerName ?? 'Walk-in'} | {item.itemCount} items
                </Text>
                <Text className="text-[10px] text-surface-400 mt-0.5">
                  {formatDate(item.createdAt)} {formatTime(item.createdAt)}
                </Text>
              </View>
              <View className="items-end">
                <MoneyDisplay
                  amountPaise={item.totalPaise}
                  className="text-sm font-semibold text-surface-900"
                />
                <View className="flex-row gap-1 mt-1">
                  <Badge
                    label={item.paymentStatus}
                    variant={getStatusVariant(item.paymentStatus)}
                    size="sm"
                  />
                </View>
              </View>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
