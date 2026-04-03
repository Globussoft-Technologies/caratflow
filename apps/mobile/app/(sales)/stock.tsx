import React, { useState, useCallback } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SearchBar } from '@/components/SearchBar';
import { DataList } from '@/components/DataList';
import { Card } from '@/components/Card';
import { Badge, getStatusVariant } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { WeightDisplay } from '@/components/WeightDisplay';
import { Button } from '@/components/Button';
import { useApiQuery } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth-store';
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

  const { data, isLoading, refetch } = useApiQuery<{
    items: StockItem[];
    total: number;
  }>(
    ['sales', 'stock', search, activeLocationId],
    '/api/v1/inventory/stock-items',
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

  const items = data?.items ?? [];

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
              Alert.alert(
                'Barcode Scanner',
                'Camera barcode scanner will open for scanning.',
              );
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
