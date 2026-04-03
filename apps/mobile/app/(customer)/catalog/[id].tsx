import React from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApiQuery } from '@/hooks/useApi';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { WeightDisplay } from '@/components/WeightDisplay';
import { Button } from '@/components/Button';
import { finenessToKaratLabel } from '@/utils/purity';

interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  productType: string;
  category: string;
  sellingPricePaise: number;
  weightMg: number;
  purityFineness: number;
  makingChargesPaise: number;
  metalValuePaise: number;
  gstPaise: number;
  hsnCode: string;
  images: string[];
  specifications: Record<string, string>;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error } = useApiQuery<ProductDetail>(
    ['customer', 'product', id],
    `/api/v1/ecommerce/catalog/${id}`,
  );

  const product = data;

  const handleInquiry = () => {
    Alert.alert(
      'Inquiry Sent',
      'Your inquiry has been sent to the store. They will contact you shortly.',
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen
        options={{ headerShown: true, title: product?.name ?? 'Product' }}
      />

      <Screen loading={isLoading} error={error?.message} scrollable>
        {product && (
          <>
            {/* Product Image Placeholder */}
            <Card className="mb-4 items-center bg-surface-100 py-12">
              <Text className="text-4xl mb-2">{'💍'}</Text>
              <Text className="text-sm text-surface-400">
                {product.images.length > 0
                  ? `${product.images.length} image(s)`
                  : 'No images available'}
              </Text>
            </Card>

            {/* Product Info */}
            <Card className="mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Badge label={product.productType} variant="info" />
                <Badge label={product.category} variant="default" />
              </View>

              <Text className="text-xl font-bold text-surface-900 mb-1">
                {product.name}
              </Text>
              {product.description && (
                <Text className="text-sm text-surface-600 mb-3">
                  {product.description}
                </Text>
              )}

              {/* Price Breakdown */}
              <View className="border-t border-surface-200 pt-3">
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-sm text-surface-600">Metal Value</Text>
                  <MoneyDisplay
                    amountPaise={product.metalValuePaise}
                    className="text-sm text-surface-700"
                  />
                </View>
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-sm text-surface-600">
                    Making Charges
                  </Text>
                  <MoneyDisplay
                    amountPaise={product.makingChargesPaise}
                    className="text-sm text-surface-700"
                  />
                </View>
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-sm text-surface-600">GST (3%)</Text>
                  <MoneyDisplay
                    amountPaise={product.gstPaise}
                    className="text-sm text-surface-700"
                  />
                </View>
                <View className="flex-row justify-between py-2 border-t border-surface-200 mt-1">
                  <Text className="text-base font-bold text-surface-900">
                    Total Price
                  </Text>
                  <MoneyDisplay
                    amountPaise={product.sellingPricePaise}
                    className="text-xl font-bold text-primary-500"
                  />
                </View>
                <Text className="text-xs text-surface-400 text-right">
                  Price based on today's rate
                </Text>
              </View>
            </Card>

            {/* Specifications */}
            <Card className="mb-4">
              <Text className="text-sm font-semibold text-surface-700 mb-2">
                Specifications
              </Text>
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-surface-600">Weight</Text>
                <WeightDisplay
                  milligrams={product.weightMg}
                  className="text-sm font-medium text-surface-900"
                />
              </View>
              {product.purityFineness > 0 && (
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-sm text-surface-600">Purity</Text>
                  <Text className="text-sm font-medium text-surface-900">
                    {finenessToKaratLabel(product.purityFineness)}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between py-1.5">
                <Text className="text-sm text-surface-600">HSN Code</Text>
                <Text className="text-sm text-surface-700">
                  {product.hsnCode}
                </Text>
              </View>
              {Object.entries(product.specifications).map(([key, value]) => (
                <View key={key} className="flex-row justify-between py-1.5">
                  <Text className="text-sm text-surface-600">{key}</Text>
                  <Text className="text-sm text-surface-700">{value}</Text>
                </View>
              ))}
            </Card>

            {/* Inquiry Button */}
            <Button
              title="Inquire About This Product"
              onPress={handleInquiry}
              size="lg"
            />
            <View className="h-6" />
          </>
        )}
      </Screen>
    </SafeAreaView>
  );
}
