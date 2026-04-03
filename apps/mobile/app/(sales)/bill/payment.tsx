import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { Badge } from '@/components/Badge';
import { useApiMutation } from '@/hooks/useApi';
import { useAuthStore } from '@/store/auth-store';
import { formatMoney, decimalToPaise, paiseToDecimal } from '@/utils/money';

type PaymentMethod = 'CASH' | 'CARD' | 'UPI';

interface PaymentSplit {
  method: PaymentMethod;
  amountPaise: number;
  reference?: string;
}

export default function PaymentScreen() {
  const params = useLocalSearchParams<{
    total: string;
    cart: string;
    customerId: string;
  }>();
  const totalPaise = parseInt(params.total ?? '0', 10);
  const cart = params.cart ? JSON.parse(params.cart) : [];
  const customerId = params.customerId || undefined;
  const { activeLocationId, user } = useAuthStore();

  const [payments, setPayments] = useState<PaymentSplit[]>([
    { method: 'CASH', amountPaise: totalPaise },
  ]);

  const [reference, setReference] = useState('');

  const paidTotal = payments.reduce((s, p) => s + p.amountPaise, 0);
  const remaining = totalPaise - paidTotal;

  const saleMutation = useApiMutation<unknown>(
    '/api/v1/retail/sales',
    {
      offlineQueue: true,
      invalidateKeys: [
        ['sales', 'today'],
        ['owner', 'dashboard'],
      ],
    },
  );

  const addPaymentMethod = (method: PaymentMethod) => {
    if (payments.find((p) => p.method === method)) return;
    setPayments([...payments, { method, amountPaise: 0 }]);
  };

  const updatePaymentAmount = (index: number, value: string) => {
    const decimal = parseFloat(value) || 0;
    const paise = decimalToPaise(decimal);
    setPayments(
      payments.map((p, i) => (i === index ? { ...p, amountPaise: paise } : p)),
    );
  };

  const removePayment = (index: number) => {
    if (payments.length <= 1) return;
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (remaining > 100) {
      // More than 1 rupee remaining
      Alert.alert('Payment', 'Payment amounts do not cover the total.');
      return;
    }

    const saleInput = {
      customerId,
      locationId: activeLocationId,
      lineItems: cart.map((c: { productId: string; name: string; quantity: number; unitPricePaise: number; metalWeightMg: number; metalRatePaise: number; makingChargesPaise: number; gstRate: number }) => ({
        productId: c.productId,
        description: c.name,
        quantity: c.quantity,
        unitPricePaise: c.unitPricePaise,
        metalWeightMg: c.metalWeightMg,
        metalRatePaise: c.metalRatePaise,
        makingChargesPaise: c.makingChargesPaise,
        gstRate: c.gstRate,
      })),
      payments: payments
        .filter((p) => p.amountPaise > 0)
        .map((p) => ({
          method: p.method,
          amountPaise: p.amountPaise,
          reference: p.reference,
        })),
      currencyCode: 'INR',
    };

    saleMutation.mutate(saleInput, {
      onSuccess: () => {
        Alert.alert('Success', 'Sale completed successfully!', [
          {
            text: 'OK',
            onPress: () => router.replace('/(sales)/bill'),
          },
        ]);
      },
      onError: (err) => {
        Alert.alert('Error', err.message);
      },
    });
  };

  const methods: { key: PaymentMethod; label: string }[] = [
    { key: 'CASH', label: 'Cash' },
    { key: 'CARD', label: 'Card' },
    { key: 'UPI', label: 'UPI' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen options={{ headerShown: true, title: 'Payment' }} />

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Amount Due */}
        <Card className="mb-4 items-center">
          <Text className="text-sm text-surface-500 mb-1">Amount Due</Text>
          <MoneyDisplay
            amountPaise={totalPaise}
            className="text-3xl font-bold text-surface-900"
          />
        </Card>

        {/* Payment Methods */}
        <Text className="text-sm font-semibold text-surface-700 mb-2">
          Payment Methods
        </Text>
        <View className="flex-row gap-2 mb-3">
          {methods.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => addPaymentMethod(m.key)}
              className={`flex-1 py-2 rounded-lg items-center ${
                payments.find((p) => p.method === m.key)
                  ? 'bg-primary-100 border border-primary-400'
                  : 'bg-surface-200'
              }`}
            >
              <Text className="text-sm font-medium text-surface-700">
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Payment Amounts */}
        {payments.map((payment, idx) => (
          <Card key={`${payment.method}-${idx}`} className="mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Badge label={payment.method} variant="info" />
              {payments.length > 1 && (
                <Pressable onPress={() => removePayment(idx)}>
                  <Text className="text-xs text-red-500">Remove</Text>
                </Pressable>
              )}
            </View>
            <Input
              label="Amount"
              placeholder="0.00"
              value={
                payment.amountPaise > 0
                  ? paiseToDecimal(payment.amountPaise).toFixed(2)
                  : ''
              }
              onChangeText={(v) => updatePaymentAmount(idx, v)}
              keyboardType="decimal-pad"
            />
            {payment.method !== 'CASH' && (
              <Input
                label="Reference"
                placeholder="Transaction reference"
                value={payment.reference ?? ''}
                onChangeText={(v) =>
                  setPayments(
                    payments.map((p, i) =>
                      i === idx ? { ...p, reference: v } : p,
                    ),
                  )
                }
              />
            )}
          </Card>
        ))}

        {/* Remaining */}
        {remaining > 0 && (
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <Text className="text-amber-700 text-sm text-center">
              Remaining: {formatMoney(remaining)}
            </Text>
          </View>
        )}

        <Button
          title="Complete Sale"
          onPress={handleSubmit}
          loading={saleMutation.isPending}
          disabled={remaining > 100}
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
