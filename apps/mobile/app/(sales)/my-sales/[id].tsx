// ─── Sale Receipt Detail ─────────────────────────────────────────
// Shown when a row in My Sales is tapped. Shows full breakdown and
// offers a Share action to send the receipt to a customer.

import React from 'react';
import { View, Text, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Badge, getStatusVariant } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { WeightDisplay } from '@/components/WeightDisplay';
import { Button } from '@/components/Button';
import { trpc } from '@/lib/trpc';
import { formatDate, formatTime } from '@/utils/date';
import { formatMoney } from '@/utils/money';

interface SaleDetail {
  id: string;
  saleNumber: string;
  invoiceNumber: string | null;
  status: string;
  paymentStatus: string;
  customerName: string | null;
  customerPhone: string | null;
  staffName: string;
  locationName: string;
  createdAt: string;
  currencyCode: string;
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  lineItems: Array<{
    id: string;
    description: string;
    sku: string | null;
    quantity: number;
    metalWeightMg: number;
    unitPricePaise: number;
    lineTotalPaise: number;
  }>;
  payments: Array<{
    id: string;
    method: string;
    amountPaise: number;
    reference: string | null;
  }>;
}

export default function SaleReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: rawData, isLoading, error } = trpc.retail.getSale.useQuery(
    { saleId: id! },
    { enabled: !!id },
  );
  const data = rawData as SaleDetail | undefined;

  const handleShare = async () => {
    if (!data) return;
    const lines = [
      `Receipt: ${data.invoiceNumber ?? data.saleNumber}`,
      `Date: ${formatDate(data.createdAt)} ${formatTime(data.createdAt)}`,
      `Customer: ${data.customerName ?? 'Walk-in'}`,
      '',
      ...data.lineItems.map(
        (li) =>
          `${li.description} x${li.quantity} - ${formatMoney(
            li.lineTotalPaise,
            data.currencyCode,
          )}`,
      ),
      '',
      `Subtotal: ${formatMoney(data.subtotalPaise, data.currencyCode)}`,
      `Discount: ${formatMoney(data.discountPaise, data.currencyCode)}`,
      `Tax: ${formatMoney(data.taxPaise, data.currencyCode)}`,
      `Total: ${formatMoney(data.totalPaise, data.currencyCode)}`,
    ].join('\n');

    try {
      await Share.share({ message: lines });
    } catch (e) {
      Alert.alert('Share', 'Could not share receipt.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen
        options={{
          headerShown: true,
          title: data?.invoiceNumber ?? data?.saleNumber ?? 'Receipt',
        }}
      />

      <Screen loading={isLoading} error={error?.message} scrollable>
        {data && (
          <>
            {/* Header */}
            <Card className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-lg font-bold text-surface-900">
                  {data.invoiceNumber ?? data.saleNumber}
                </Text>
                <Badge
                  label={data.paymentStatus}
                  variant={getStatusVariant(data.paymentStatus)}
                />
              </View>
              <Text className="text-xs text-surface-500">
                {formatDate(data.createdAt)} | {formatTime(data.createdAt)}
              </Text>
              <Text className="text-xs text-surface-500 mt-0.5">
                {data.locationName} | by {data.staffName}
              </Text>
              <Text className="text-sm text-surface-700 mt-2">
                Customer: {data.customerName ?? 'Walk-in'}
                {data.customerPhone ? ` (${data.customerPhone})` : ''}
              </Text>
            </Card>

            {/* Line items */}
            <Card className="mb-4">
              <Text className="text-sm font-semibold text-surface-700 mb-2">
                Items
              </Text>
              {data.lineItems.map((li) => (
                <View
                  key={li.id}
                  className="py-2 border-b border-surface-100"
                >
                  <View className="flex-row justify-between">
                    <Text className="text-sm font-medium text-surface-900 flex-1 mr-2">
                      {li.description}
                    </Text>
                    <MoneyDisplay
                      amountPaise={li.lineTotalPaise}
                      currencyCode={data.currencyCode}
                      className="text-sm font-semibold text-surface-900"
                    />
                  </View>
                  <View className="flex-row items-center gap-3 mt-0.5">
                    {li.sku && (
                      <Text className="text-[10px] text-surface-400">
                        {li.sku}
                      </Text>
                    )}
                    <Text className="text-[10px] text-surface-400">
                      Qty: {li.quantity}
                    </Text>
                    {li.metalWeightMg > 0 && (
                      <WeightDisplay
                        milligrams={li.metalWeightMg}
                        className="text-[10px] text-surface-400"
                      />
                    )}
                  </View>
                </View>
              ))}
            </Card>

            {/* Totals */}
            <Card className="mb-4">
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Subtotal</Text>
                <MoneyDisplay
                  amountPaise={data.subtotalPaise}
                  currencyCode={data.currencyCode}
                  className="text-sm text-surface-700"
                />
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Discount</Text>
                <MoneyDisplay
                  amountPaise={data.discountPaise}
                  currencyCode={data.currencyCode}
                  className="text-sm text-surface-700"
                />
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Tax</Text>
                <MoneyDisplay
                  amountPaise={data.taxPaise}
                  currencyCode={data.currencyCode}
                  className="text-sm text-surface-700"
                />
              </View>
              <View className="flex-row justify-between py-2 border-t border-surface-200 mt-1">
                <Text className="text-base font-bold text-surface-900">
                  Total
                </Text>
                <MoneyDisplay
                  amountPaise={data.totalPaise}
                  currencyCode={data.currencyCode}
                  className="text-base font-bold text-primary-500"
                />
              </View>
            </Card>

            {/* Payments */}
            <Card className="mb-4">
              <Text className="text-sm font-semibold text-surface-700 mb-2">
                Payments
              </Text>
              {data.payments.map((p) => (
                <View
                  key={p.id}
                  className="flex-row justify-between py-2 border-b border-surface-100"
                >
                  <View>
                    <Badge label={p.method} variant="info" size="sm" />
                    {p.reference && (
                      <Text className="text-[10px] text-surface-400 mt-0.5">
                        Ref: {p.reference}
                      </Text>
                    )}
                  </View>
                  <MoneyDisplay
                    amountPaise={p.amountPaise}
                    currencyCode={data.currencyCode}
                    className="text-sm text-surface-700"
                  />
                </View>
              ))}
            </Card>

            <Button
              title="Share Receipt"
              onPress={handleShare}
              variant="primary"
              size="lg"
            />
          </>
        )}
      </Screen>
    </SafeAreaView>
  );
}
