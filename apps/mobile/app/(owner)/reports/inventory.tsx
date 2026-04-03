import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useApiQuery } from '@/hooks/useApi';
import { Card } from '@/components/Card';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { WeightDisplay } from '@/components/WeightDisplay';
import { formatMoneyShort } from '@/utils/money';
import { Badge } from '@/components/Badge';

interface InventoryReportData {
  totalValuePaise: number;
  totalSKUs: number;
  categoryBreakdown: Array<{
    categoryName: string;
    itemCount: number;
    valuePaise: number;
  }>;
  metalBreakdown: Array<{
    metalType: string;
    purityFineness: number;
    totalWeightMg: number;
    totalValuePaise: number;
  }>;
  lowStockItems: Array<{
    productName: string;
    sku: string;
    locationName: string;
    quantityOnHand: number;
    reorderLevel: number;
  }>;
}

export default function InventoryReportScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useApiQuery<InventoryReportData>(
    ['owner', 'reports', 'inventory'],
    '/api/v1/reporting/inventory-summary',
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const report = data ?? {
    totalValuePaise: 0,
    totalSKUs: 0,
    categoryBreakdown: [],
    metalBreakdown: [],
    lowStockItems: [],
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen options={{ headerShown: true, title: 'Inventory Report' }} />

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
        {/* Overview */}
        <View className="flex-row gap-3 mb-4">
          <Card className="flex-1">
            <Text className="text-xs text-surface-500 mb-1">Total Value</Text>
            <Text className="text-lg font-bold text-surface-900">
              {formatMoneyShort(report.totalValuePaise)}
            </Text>
          </Card>
          <Card className="flex-1">
            <Text className="text-xs text-surface-500 mb-1">Total SKUs</Text>
            <Text className="text-lg font-bold text-surface-900">
              {report.totalSKUs}
            </Text>
          </Card>
        </View>

        {/* Category Breakdown */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-3">
            By Category
          </Text>
          {report.categoryBreakdown.map((cat, idx) => (
            <View
              key={idx}
              className="flex-row items-center justify-between py-2.5 border-b border-surface-100"
            >
              <View>
                <Text className="text-sm font-medium text-surface-800">
                  {cat.categoryName}
                </Text>
                <Text className="text-xs text-surface-500">
                  {cat.itemCount} items
                </Text>
              </View>
              <MoneyDisplay
                amountPaise={cat.valuePaise}
                short
                className="text-sm font-semibold text-surface-900"
              />
            </View>
          ))}
          {report.categoryBreakdown.length === 0 && (
            <Text className="text-surface-400 text-sm text-center py-4">
              No category data
            </Text>
          )}
        </Card>

        {/* Metal Breakdown */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-3">
            Metal Stock
          </Text>
          {report.metalBreakdown.map((metal, idx) => (
            <View
              key={idx}
              className="flex-row items-center justify-between py-2.5 border-b border-surface-100"
            >
              <View>
                <Text className="text-sm font-medium text-surface-800">
                  {metal.metalType} ({metal.purityFineness})
                </Text>
                <WeightDisplay
                  milligrams={metal.totalWeightMg}
                  className="text-xs text-surface-500"
                />
              </View>
              <MoneyDisplay
                amountPaise={metal.totalValuePaise}
                short
                className="text-sm font-semibold text-surface-900"
              />
            </View>
          ))}
          {report.metalBreakdown.length === 0 && (
            <Text className="text-surface-400 text-sm text-center py-4">
              No metal data
            </Text>
          )}
        </Card>

        {/* Low Stock Alerts */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-surface-700">
              Low Stock Alerts
            </Text>
            <Badge label={`${report.lowStockItems.length}`} variant="danger" />
          </View>
          {report.lowStockItems.map((item, idx) => (
            <View
              key={idx}
              className="py-2.5 border-b border-surface-100"
            >
              <Text className="text-sm font-medium text-surface-800">
                {item.productName}
              </Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-xs text-surface-500">
                  SKU: {item.sku} | {item.locationName}
                </Text>
              </View>
              <Text className="text-xs text-red-500 mt-0.5">
                On hand: {item.quantityOnHand} (Reorder at: {item.reorderLevel})
              </Text>
            </View>
          ))}
          {report.lowStockItems.length === 0 && (
            <Text className="text-green-600 text-sm text-center py-4">
              All stock levels are healthy
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
