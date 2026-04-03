import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useApiQuery } from '@/hooks/useApi';
import { Card } from '@/components/Card';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { formatMoneyShort } from '@/utils/money';

type DateRange = '7d' | '30d' | '90d' | 'fy';

interface SalesReportData {
  totalRevenuePaise: number;
  totalSalesCount: number;
  averageTicketPaise: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenuePaise: number;
  }>;
  dailySales: Array<{
    date: string;
    revenuePaise: number;
    count: number;
  }>;
}

export default function SalesReportScreen() {
  const [range, setRange] = useState<DateRange>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useApiQuery<SalesReportData>(
    ['owner', 'reports', 'sales', range],
    '/api/v1/reporting/sales-summary',
    { range },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const report = data ?? {
    totalRevenuePaise: 0,
    totalSalesCount: 0,
    averageTicketPaise: 0,
    topProducts: [],
    dailySales: [],
  };

  const ranges: { key: DateRange; label: string }[] = [
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
                range === r.key
                  ? 'bg-primary-400'
                  : 'bg-surface-200'
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
              {formatMoneyShort(report.totalRevenuePaise)}
            </Text>
          </Card>
          <Card className="flex-1">
            <Text className="text-xs text-surface-500 mb-1">Sales Count</Text>
            <Text className="text-lg font-bold text-surface-900">
              {report.totalSalesCount}
            </Text>
          </Card>
        </View>

        <Card className="mb-4">
          <Text className="text-xs text-surface-500 mb-1">Avg. Ticket</Text>
          <MoneyDisplay
            amountPaise={report.averageTicketPaise}
            className="text-lg font-bold text-surface-900"
          />
        </Card>

        {/* Sales Trend (simple bar chart) */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-3">
            Sales Trend
          </Text>
          {report.dailySales.length > 0 ? (
            <View className="flex-row items-end gap-0.5 h-20">
              {(() => {
                const maxRev = Math.max(
                  ...report.dailySales.map((d) => d.revenuePaise),
                  1,
                );
                // Show last 14 data points max
                const displayData = report.dailySales.slice(-14);
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
          {report.topProducts.length > 0 ? (
            report.topProducts.slice(0, 10).map((product, idx) => (
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
                  amountPaise={product.revenuePaise}
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
