// ─── Sales Report ────────────────────────────────────────────
// Wired to tRPC. The backend does not expose a single
// `reporting.salesReport` procedure, so this screen combines:
//   - reporting.salesByPeriod   (daily time series + totals)
//   - reporting.salesByProduct  (top sellers by revenue)
//
// Numeric paise fields arrive as strings over the wire (BigInt ->
// string via the server transformer). We coerce with Number() where
// arithmetic is needed.

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Card } from '@/components/Card';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { formatMoneyShort } from '@/utils/money';
import { trpc } from '@/lib/trpc';

type DateRangeKey = '7d' | '30d' | '90d' | 'fy';

interface SalesSummaryRow {
  date: string;
  salesCount: number;
  totalRevenuePaise: number | string;
  avgTicketPaise: number | string;
  returnCount: number;
  netRevenuePaise: number | string;
}

interface SalesByPeriodResp {
  summary: SalesSummaryRow[];
  totals: {
    totalSales: number;
    totalRevenuePaise: number | string;
    avgTicketPaise: number | string;
    totalReturns: number;
    netRevenuePaise: number | string;
  };
}

interface SalesByProductRow {
  productId: string;
  productName: string;
  sku: string;
  categoryName: string | null;
  quantitySold: number;
  totalRevenuePaise: number | string;
}

function asNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return 0;
}

/** Return a { from, to } pair of Date objects for the picked range. */
function rangeDates(key: DateRangeKey): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  if (key === '7d') from.setDate(from.getDate() - 7);
  else if (key === '30d') from.setDate(from.getDate() - 30);
  else if (key === '90d') from.setDate(from.getDate() - 90);
  else if (key === 'fy') {
    // Indian financial year: April 1 of current or previous FY.
    const y = to.getMonth() >= 3 ? to.getFullYear() : to.getFullYear() - 1;
    from.setFullYear(y, 3, 1);
  }
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export default function SalesReportScreen() {
  const [range, setRange] = useState<DateRangeKey>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const dateRange = useMemo(() => rangeDates(range), [range]);

  const periodQ = trpc.reporting.salesByPeriod.useQuery({
    dateRange,
    groupBy: 'day' as never,
  });
  const productsQ = trpc.reporting.salesByProduct.useQuery({
    dateRange,
    limit: 10,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([periodQ.refetch(), productsQ.refetch()]);
    setRefreshing(false);
  }, [periodQ, productsQ]);

  const period = periodQ.data as unknown as SalesByPeriodResp | undefined;
  const products =
    (productsQ.data as unknown as SalesByProductRow[] | undefined) ?? [];

  const totalRevenuePaise = asNumber(period?.totals.totalRevenuePaise ?? 0);
  const totalSalesCount = period?.totals.totalSales ?? 0;
  const averageTicketPaise = asNumber(period?.totals.avgTicketPaise ?? 0);
  const dailySales =
    period?.summary.map((s) => ({
      date: s.date,
      revenuePaise: asNumber(s.totalRevenuePaise),
      count: s.salesCount,
    })) ?? [];

  const ranges: { key: DateRangeKey; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: 'fy', label: 'FY' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen options={{ headerShown: true, title: 'Sales Report' }} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#d4af37']}
            tintColor="#d4af37"
          />
        }
      >
        {/* Date Range Selector */}
        <View className="flex-row gap-2 mb-4">
          {ranges.map((r) => (
            <Pressable
              key={r.key}
              onPress={() => setRange(r.key)}
              className={`flex-1 py-2 rounded-lg items-center ${
                range === r.key ? 'bg-primary-400' : 'bg-surface-200'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  range === r.key ? 'text-white' : 'text-surface-700'
                }`}
              >
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Summary Cards */}
        <View className="flex-row gap-3 mb-4">
          <Card className="flex-1">
            <Text className="text-xs text-surface-500 mb-1">Total Revenue</Text>
            <Text className="text-lg font-bold text-surface-900">
              {formatMoneyShort(totalRevenuePaise)}
            </Text>
          </Card>
          <Card className="flex-1">
            <Text className="text-xs text-surface-500 mb-1">Sales Count</Text>
            <Text className="text-lg font-bold text-surface-900">
              {totalSalesCount}
            </Text>
          </Card>
        </View>

        <Card className="mb-4">
          <Text className="text-xs text-surface-500 mb-1">Avg. Ticket</Text>
          <MoneyDisplay
            amountPaise={averageTicketPaise}
            className="text-lg font-bold text-surface-900"
          />
        </Card>

        {/* Sales Trend (simple bar chart) */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-3">
            Sales Trend
          </Text>
          {dailySales.length > 0 ? (
            <View className="flex-row items-end gap-0.5 h-20">
              {(() => {
                const maxRev = Math.max(
                  ...dailySales.map((d) => d.revenuePaise),
                  1,
                );
                const displayData = dailySales.slice(-14);
                return displayData.map((day, idx) => {
                  const height = Math.max(
                    (day.revenuePaise / maxRev) * 72,
                    2,
                  );
                  return (
                    <View key={idx} className="flex-1 items-center">
                      <View
                        className="w-full bg-primary-300 rounded-t"
                        style={{ height }}
                      />
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

        {/* Top Products */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-3">
            Top Products
          </Text>
          {products.length > 0 ? (
            products.slice(0, 10).map((product, idx) => (
              <View
                key={product.productId}
                className="flex-row items-center justify-between py-2.5 border-b border-surface-100"
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-surface-800">
                    {idx + 1}. {product.productName}
                  </Text>
                  <Text className="text-xs text-surface-500">
                    {product.quantitySold} sold
                  </Text>
                </View>
                <MoneyDisplay
                  amountPaise={asNumber(product.totalRevenuePaise)}
                  short
                  className="text-sm font-semibold text-surface-900"
                />
              </View>
            ))
          ) : (
            <Text className="text-surface-400 text-sm text-center py-4">
              No products data
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
