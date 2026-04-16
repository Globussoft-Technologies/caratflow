import React, { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { SearchBar } from '@/components/SearchBar';
import { DataList } from '@/components/DataList';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { WeightDisplay } from '@/components/WeightDisplay';
import { Button } from '@/components/Button';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth-store';
import { useScanStore } from '@/store/scan-store';
import { finenessToKaratLabel } from '@/utils/purity';

interface StockItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  productType: string;
  sellingPricePaise: number;
  weightMg: number;
  purityFineness: number;
  quantityAvailable: number;
  quantityOnHand: number;
  locationName: string;
  barcodeData: string | null;
}

export default function StockScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { activeLocationId } = useAuthStore();
  const consumeScan = useScanStore((s) => s.consume);
  const requestScan = useScanStore((s) => s.request);
  const scanIntent = useScanStore((s) => s.intent);

  const { data, isLoading, refetch } = trpc.inventory.stockItems.list.useQuery(
    {
      search: search || undefined,
      locationId: activeLocationId ?? undefined,
      limit: 50,
    },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Pop the scanner result back into the search box on focus return.
  useFocusEffect(
    useCallback(() => {
      if (scanIntent !== 'stock-sku') return;
      const scanned = consumeScan();
      if (scanned?.data) {
        setSearch(scanned.data);
      }
    }, [scanIntent, consumeScan]),
  );

  // Data shape comes from tRPC inventoryService.findAllStockItems — cast for display.
  const items = ((data as { items?: StockItem[] } | undefined)?.items ?? []) as StockItem[];

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-surface-900 mb-3">
          Stock Lookup
        </Text>
        <View className="flex-row gap-2 mb-2">
          <View className="flex-1">
            <SearchBar
              placeholder="Search by name, SKU..."
              onSearch={setSearch}
            />
          </View>
          <Button
            title="Scan"
            variant="secondary"
            size="sm"
            onPress={() => {
              requestScan('stock-sku');
              router.push('/(sales)/scanner');
            }}
          />
        </View>
      </View>

      <DataList
        data={items}
        keyExtractor={(item) => item.id}
        loading={isLoading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        emptyTitle="No stock items found"
        emptySubtitle="Try a different search or scan a barcode"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <Card
            className="mb-2"
            onPress={() =>
              router.push(`/(sales)/stock/${item.productId}` as never)
            }
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text
                  className="text-sm font-semibold text-surface-900"
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text className="text-xs text-surface-500">
                  {item.sku} | {item.productType}
                </Text>
                <View className="flex-row items-center mt-1 gap-2">
                  <WeightDisplay
                    milligrams={item.weightMg}
                    className="text-xs text-surface-600"
                  />
                  {item.purityFineness > 0 && (
                    <Text className="text-xs text-surface-600">
                      {finenessToKaratLabel(item.purityFineness)}
                    </Text>
                  )}
                </View>
              </View>
              <View className="items-end">
                <MoneyDisplay
                  amountPaise={item.sellingPricePaise}
                  className="text-sm font-semibold text-primary-500"
                />
                <Badge
                  label={`Avail: ${item.quantityAvailable}`}
                  variant={item.quantityAvailable > 0 ? 'success' : 'danger'}
                  size="sm"
                />
                <Text className="text-[10px] text-surface-400 mt-1">
                  {item.locationName}
                </Text>
              </View>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
