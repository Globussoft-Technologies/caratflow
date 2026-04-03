import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApiQuery } from '@/hooks/useApi';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { WeightDisplay } from '@/components/WeightDisplay';
import { finenessToKaratLabel } from '@/utils/purity';

interface ProductDetail {
  id: string;
  sku: string;
  name: string;
  productType: string;
  description: string | null;
  costPricePaise: number;
  sellingPricePaise: number;
  weightMg: number;
  purityFineness: number;
  hsnCode: string;
  images: string[];
  stockByLocation: Array<{
    locationId: string;
    locationName: string;
    quantityOnHand: number;
    quantityAvailable: number;
  }>;
}

export default function StockDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error } = useApiQuery<ProductDetail>(
    ['sales', 'product', id],
    `/api/v1/inventory/products/${id}`,
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen
        options={{ headerShown: true, title: data?.name ?? 'Product' }}
      />

      <Screen loading={isLoading} error={error?.message} scrollable>
        {data && (
          <>
            {/* Product Header */}
            <Card className="mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Badge label={data.productType} variant="info" />
                <Text className="text-xs text-surface-400">
                  SKU: {data.sku}
                </Text>
              </View>
              <Text className="text-xl font-bold text-surface-900 mb-1">
                {data.name}
              </Text>
              {data.description && (
                <Text className="text-sm text-surface-600 mb-3">
                  {data.description}
                </Text>
              )}

              <View className="flex-row justify-between py-2 border-t border-surface-200">
                <Text className="text-sm text-surface-600">Selling Price</Text>
                <MoneyDisplay
                  amountPaise={data.sellingPricePaise}
                  className="text-lg font-bold text-primary-500"
                />
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-sm text-surface-600">Weight</Text>
                <WeightDisplay
                  milligrams={data.weightMg}
                  className="text-sm font-medium text-surface-900"
                />
              </View>
              {data.purityFineness > 0 && (
                <View className="flex-row justify-between py-2">
                  <Text className="text-sm text-surface-600">Purity</Text>
                  <Text className="text-sm font-medium text-surface-900">
                    {finenessToKaratLabel(data.purityFineness)}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between py-2">
                <Text className="text-sm text-surface-600">HSN Code</Text>
                <Text className="text-sm text-surface-700">{data.hsnCode}</Text>
              </View>
            </Card>

            {/* Stock by Location */}
            <Card className="mb-4">
              <Text className="text-sm font-semibold text-surface-700 mb-3">
                Availability by Location
              </Text>
              {data.stockByLocation.map((loc) => (
                <View
                  key={loc.locationId}
                  className="flex-row items-center justify-between py-2.5 border-b border-surface-100"
                >
                  <Text className="text-sm text-surface-800">
                    {loc.locationName}
                  </Text>
                  <View className="items-end">
                    <Text className="text-sm font-semibold text-surface-900">
                      {loc.quantityAvailable} available
                    </Text>
                    <Text className="text-xs text-surface-500">
                      {loc.quantityOnHand} on hand
                    </Text>
                  </View>
                </View>
              ))}
              {data.stockByLocation.length === 0 && (
                <Text className="text-sm text-surface-400 text-center py-3">
                  No stock data available
                </Text>
              )}
            </Card>
          </>
        )}
      </Screen>
    </SafeAreaView>
  );
}
