import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Card } from '@/components/Card';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { WeightDisplay } from '@/components/WeightDisplay';
import { Button } from '@/components/Button';
import { formatMoney } from '@/utils/money';

interface CartItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPricePaise: number;
  metalWeightMg: number;
  metalRatePaise: number;
  makingChargesPaise: number;
  gstRate: number;
  lineTotalPaise: number;
}

export default function CartScreen() {
  const params = useLocalSearchParams<{ cart?: string; total?: string; customerId?: string }>();
  const cart: CartItem[] = params.cart ? JSON.parse(params.cart) : [];
  const totalPaise = params.total ? parseInt(params.total, 10) : 0;

  const subtotal = cart.reduce((s, c) => s + c.lineTotalPaise, 0);
  const taxTotal = totalPaise - subtotal;

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen options={{ headerShown: true, title: 'Cart Details' }} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
      >
        {cart.map((item) => {
          const itemTax = Math.round((item.lineTotalPaise * item.gstRate) / 10000);
          return (
            <Card key={item.productId} className="mb-3">
              <Text className="text-base font-semibold text-surface-900">
                {item.name}
              </Text>
              <Text className="text-xs text-surface-500 mb-2">
                SKU: {item.sku}
              </Text>

              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Weight</Text>
                <WeightDisplay
                  milligrams={item.metalWeightMg}
                  className="text-sm text-surface-700"
                />
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Rate</Text>
                <MoneyDisplay
                  amountPaise={item.metalRatePaise}
                  className="text-sm text-surface-700"
                />
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Making Charges</Text>
                <MoneyDisplay
                  amountPaise={item.makingChargesPaise}
                  className="text-sm text-surface-700"
                />
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">
                  GST ({(item.gstRate / 100).toFixed(1)}%)
                </Text>
                <MoneyDisplay
                  amountPaise={itemTax}
                  className="text-sm text-surface-700"
                />
              </View>
              <View className="flex-row justify-between py-1 border-t border-surface-200 mt-1">
                <Text className="text-sm font-semibold text-surface-900">
                  Line Total
                </Text>
                <MoneyDisplay
                  amountPaise={item.lineTotalPaise + itemTax}
                  className="text-sm font-semibold text-surface-900"
                />
              </View>
            </Card>
          );
        })}

        {/* Totals */}
        <Card className="mb-4">
          <View className="flex-row justify-between py-1">
            <Text className="text-sm text-surface-600">Subtotal</Text>
            <MoneyDisplay amountPaise={subtotal} className="text-sm text-surface-700" />
          </View>
          <View className="flex-row justify-between py-1">
            <Text className="text-sm text-surface-600">Total Tax</Text>
            <MoneyDisplay amountPaise={taxTotal} className="text-sm text-surface-700" />
          </View>
          <View className="flex-row justify-between py-1 border-t border-surface-200 mt-1">
            <Text className="text-lg font-bold text-surface-900">Grand Total</Text>
            <MoneyDisplay
              amountPaise={totalPaise}
              className="text-lg font-bold text-primary-500"
            />
          </View>
        </Card>

        <Button
          title={`Proceed to Payment (${formatMoney(totalPaise)})`}
          onPress={() =>
            router.push({
              pathname: '/(sales)/bill/payment',
              params: {
                total: String(totalPaise),
                cart: params.cart ?? '[]',
                customerId: params.customerId ?? '',
              },
            })
          }
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
