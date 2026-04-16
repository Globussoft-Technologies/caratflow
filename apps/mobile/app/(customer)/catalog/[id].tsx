import React from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { WeightDisplay } from '@/components/WeightDisplay';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/store/auth-store';
import { finenessToKaratLabel } from '@/utils/purity';

/**
 * Product detail + "Inquire About This Product" now creates a real
 * CRM lead via trpc.crm.leadCreate.
 */
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = id ?? '';
  const { user } = useAuthStore();

  const productQuery = trpc.storefront.catalog.getById.useQuery(
    { id: productId },
    { enabled: !!productId },
  );

  const product = productQuery.data as
    | {
        id: string;
        name: string;
        description: string | null;
        productType: string;
        categoryName: string | null;
        totalPricePaise: number | string;
        netWeightMg: number | null;
        grossWeightMg: number | null;
        metalWeightMg: number | null;
        metalPurity: number | null;
        makingValuePaise: number | string;
        metalValuePaise: number | string;
        gstPaise: number | string;
        huidNumber: string | null;
        hallmarkNumber: string | null;
        images: string[] | null;
        attributes: Record<string, unknown> | null;
      }
    | undefined;

  const leadMutation = trpc.crm.leadCreate.useMutation({
    onSuccess: () => {
      Alert.alert(
        'Inquiry Sent',
        'Your inquiry has been sent to the store. They will contact you shortly.',
      );
    },
    onError: (err) => {
      Alert.alert('Unable to send inquiry', err.message);
    },
  });

  const handleInquiry = () => {
    if (!product) return;
    // LeadInputSchema requires firstName/lastName + source enum.
    // Product inquiries are not part of the enum, so route through
    // OTHER and encode the product context in notes.
    leadMutation.mutate({
      customerId: user?.id,
      firstName: user?.firstName ?? 'Customer',
      lastName: user?.lastName ?? '',
      email: user?.email ?? undefined,
      source: 'OTHER',
      notes: `Product inquiry from mobile app.\nProduct: ${product.name} (${product.id})`,
    });
  };

  const weight =
    product?.netWeightMg ??
    product?.grossWeightMg ??
    product?.metalWeightMg ??
    0;

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen
        options={{ headerShown: true, title: product?.name ?? 'Product' }}
      />

      <Screen
        loading={productQuery.isLoading}
        error={productQuery.error?.message}
        scrollable
      >
        {product && (
          <>
            {/* Product Image Placeholder */}
            <Card className="mb-4 items-center bg-surface-100 py-12">
              <Text className="text-4xl mb-2">{'💍'}</Text>
              <Text className="text-sm text-surface-400">
                {product.images && product.images.length > 0
                  ? `${product.images.length} image(s)`
                  : 'No images available'}
              </Text>
            </Card>

            {/* Product Info */}
            <Card className="mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Badge label={product.productType} variant="info" />
                {product.categoryName && (
                  <Badge label={product.categoryName} variant="default" />
                )}
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
                    amountPaise={Number(product.metalValuePaise)}
                    className="text-sm text-surface-700"
                  />
                </View>
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-sm text-surface-600">
                    Making Charges
                  </Text>
                  <MoneyDisplay
                    amountPaise={Number(product.makingValuePaise)}
                    className="text-sm text-surface-700"
                  />
                </View>
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-sm text-surface-600">GST</Text>
                  <MoneyDisplay
                    amountPaise={Number(product.gstPaise)}
                    className="text-sm text-surface-700"
                  />
                </View>
                <View className="flex-row justify-between py-2 border-t border-surface-200 mt-1">
                  <Text className="text-base font-bold text-surface-900">
                    Total Price
                  </Text>
                  <MoneyDisplay
                    amountPaise={Number(product.totalPricePaise)}
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
              {Number(weight) > 0 && (
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-sm text-surface-600">Weight</Text>
                  <WeightDisplay
                    milligrams={Number(weight)}
                    className="text-sm font-medium text-surface-900"
                  />
                </View>
              )}
              {product.metalPurity != null && product.metalPurity > 0 && (
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-sm text-surface-600">Purity</Text>
                  <Text className="text-sm font-medium text-surface-900">
                    {finenessToKaratLabel(product.metalPurity)}
                  </Text>
                </View>
              )}
              {product.huidNumber && (
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-sm text-surface-600">HUID</Text>
                  <Text className="text-sm text-surface-700">
                    {product.huidNumber}
                  </Text>
                </View>
              )}
              {product.hallmarkNumber && (
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-sm text-surface-600">Hallmark</Text>
                  <Text className="text-sm text-surface-700">
                    {product.hallmarkNumber}
                  </Text>
                </View>
              )}
              {product.attributes &&
                Object.entries(product.attributes).map(([key, value]) => (
                  <View key={key} className="flex-row justify-between py-1.5">
                    <Text className="text-sm text-surface-600">{key}</Text>
                    <Text className="text-sm text-surface-700">
                      {String(value)}
                    </Text>
                  </View>
                ))}
            </Card>

            {/* Inquiry Button */}
            <Button
              title="Inquire About This Product"
              onPress={handleInquiry}
              loading={leadMutation.isPending}
              size="lg"
            />
            <View className="h-6" />
          </>
        )}
      </Screen>
    </SafeAreaView>
  );
}
