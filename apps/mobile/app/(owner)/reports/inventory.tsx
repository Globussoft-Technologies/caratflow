// ─── Inventory Report ─────────────────────────────────────────
// Wired to tRPC. There is no single `reporting.inventoryReport`
// procedure; this screen combines:
//   - reporting.stockSummary     (category breakdown + total value)
//   - reporting.metalStockSummary (gold/silver/platinum by purity)
//   - reporting.lowStockAlert     (items below reorder level)

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Card } from '@/components/Card';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { WeightDisplay } from '@/components/WeightDisplay';
import { formatMoneyShort } from '@/utils/money';
import { Badge } from '@/components/Badge';
import { trpc } from '@/lib/trpc';

interface StockSummaryRow {
  category: string;
  totalItems: number;
  totalQuantity: number;
  totalValuePaise: number | string;
}

interface StockSummaryResp {
  stockSummary: StockSummaryRow[];
  totalValuePaise: number | string;
  totalItems: number;
  totalQuantity: number;
}

interface MetalStockRow {
  metalType: string;
  purityFineness: number;
  locationName: string;
  weightMg: number | string;
  valuePaise: number | string;
}

interface LowStockItem {
  productId: string;
  productName: string;
  sku: string;
  locationName: string;
  quantityOnHand: number;
  reorderLevel: number;
  deficit: number;
}

function asNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return 0;
}

export default function InventoryReportScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const stockQ = trpc.reporting.stockSummary.useQuery({});
  const metalQ = trpc.reporting.metalStockSummary.useQuery();
  const lowStockQ = trpc.reporting.lowStockAlert.useQuery();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      stockQ.refetch(),
      metalQ.refetch(),
      lowStockQ.refetch(),
    ]);
    setRefreshing(false);
  }, [stockQ, metalQ, lowStockQ]);

  const stock = stockQ.data as unknown as StockSummaryResp | undefined;
  const metal = (metalQ.data as unknown as MetalStockRow[] | undefined) ?? [];
  const lowStock =
    (lowStockQ.data as unknown as LowStockItem[] | undefined) ?? [];

  const totalValuePaise = asNumber(stock?.totalValuePaise ?? 0);
  const totalSKUs = stock?.totalItems ?? 0;
  const categoryBreakdown =
    stock?.stockSummary.map((s) => ({
      categoryName: s.category,
      itemCount: s.totalItems,
      valuePaise: asNumber(s.totalValuePaise),
    })) ?? [];

  // Aggregate metal stock across locations for display (metalType +
  // purity as the key).
  const metalAgg = new Map<
    string,
    {
      metalType: string;
      purityFineness: number;
      totalWeightMg: number;
      totalValuePaise: number;
    }
  >();
  for (const m of metal) {
    const key = `${m.metalType}-${m.purityFineness}`;
    const existing = metalAgg.get(key);
    if (existing) {
      existing.totalWeightMg += asNumber(m.weightMg);
      existing.totalValuePaise += asNumber(m.valuePaise);
    } else {
      metalAgg.set(key, {
        metalType: m.metalType,
        purityFineness: m.purityFineness,
        totalWeightMg: asNumber(m.weightMg),
        totalValuePaise: asNumber(m.valuePaise),
      });
    }
  }
  const metalBreakdown = Array.from(metalAgg.values());

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen
        options={{ headerShown: true, title: 'Inventory Report' }}
      />

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
              {formatMoneyShort(totalValuePaise)}
            </Text>
          </Card>
          <Card className="flex-1">
            <Text className="text-xs text-surface-500 mb-1">Total SKUs</Text>
            <Text className="text-lg font-bold text-surface-900">
              {totalSKUs}
            </Text>
          </Card>
        </View>

        {/* Category Breakdown */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-3">
            By Category
          </Text>
          {categoryBreakdown.map((cat, idx) => (
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
          {categoryBreakdown.length === 0 && (
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
          {metalBreakdown.map((metalRow, idx) => (
            <View
              key={idx}
              className="flex-row items-center justify-between py-2.5 border-b border-surface-100"
            >
              <View>
                <Text className="text-sm font-medium text-surface-800">
                  {metalRow.metalType} ({metalRow.purityFineness})
                </Text>
                <WeightDisplay
                  milligrams={metalRow.totalWeightMg}
                  className="text-xs text-surface-500"
                />
              </View>
              <MoneyDisplay
                amountPaise={metalRow.totalValuePaise}
                short
                className="text-sm font-semibold text-surface-900"
              />
            </View>
          ))}
          {metalBreakdown.length === 0 && (
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
            <Badge label={`${lowStock.length}`} variant="danger" />
          </View>
          {lowStock.map((item, idx) => (
            <View key={idx} className="py-2.5 border-b border-surface-100">
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
          {lowStock.length === 0 && (
            <Text className="text-green-600 text-sm text-center py-4">
              All stock levels are healthy
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
