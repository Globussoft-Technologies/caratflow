import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { WeightDisplay } from '@/components/WeightDisplay';
import { finenessToKaratLabel } from '@/utils/purity';
import { trpc } from '@/lib/trpc';

interface ProductDetail {
  product: {
    id: string;
    sku: string;
    name: string;
    productType: string;
    description: string | null;
    metalType: string | null;
    purityFineness: number;
    weightMg: number;
    costPricePaise: number;
    sellingPricePaise: number;
    hsnCode: string;
    images: string[];
  };
  stockByLocation: Array<{
    locationId: string;
    locationName: string;
    quantity: number;
    reservedQuantity: number;
    quantityOnHand: number;
    quantityAvailable: number;
  }>;
}

export default function StockDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error } = trpc.inventory.products.getWithStock.useQuery(
    { productId: id ?? '' },
    { enabled: !!id },
  );

  const detail = data as unknown as ProductDetail | undefined;
  const product = detail?.product;
  const stockByLocation = detail?.stockByLocation ?? [];

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen
        options={{ headerShown: true, title: product?.name ?? 'Product' }}
      />

      <Screen loading={isLoading} error={error?.message} scrollable>
        {product && (
          <>
            {/* Product Header */}
            <Card className="mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Badge label={product.productType} variant="info" />
                <Text className="text-xs text-surface-400">
                  SKU: {product.sku}
                </Text>
              </View>
              <Text className="text-xl font-bold text-surface-900 mb-1">
                {product.name}
              </Text>
              {product.description && (
                <Text className="text-sm text-surface-600 mb-3">
                  {product.description}
                </Text>
              )}

              <View className="flex-row justify-between py-2 border-t border-surface-200">
                <Text className="text-sm text-surface-600">Selling Price</Text>
                <MoneyDisplay
                  amountPaise={product.sellingPricePaise}
                  className="text-lg font-bold text-primary-500"
                />
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-sm text-surface-600">Weight</Text>
                <WeightDisplay
                  milligrams={product.weightMg}
                  className="text-sm font-medium text-surface-900"
                />
              </View>
              {product.purityFineness > 0 && (
                <View className="flex-row justify-between py-2">
                  <Text className="text-sm text-surface-600">Purity</Text>
                  <Text className="text-sm font-medium text-surface-900">
                    {finenessToKaratLabel(product.purityFineness)}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between py-2">
                <Text className="text-sm text-surface-600">HSN Code</Text>
                <Text className="text-sm text-surface-700">{product.hsnCode}</Text>
              </View>
            </Card>

            {/* Stock by Location */}
            <Card className="mb-4">
              <Text className="text-sm font-semibold text-surface-700 mb-3">
                Availability by Location
              </Text>
              {stockByLocation.map((loc) => (
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
              {stockByLocation.length === 0 && (
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
