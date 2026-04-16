import React, { useState } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Badge, getStatusVariant } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { Button } from '@/components/Button';
import { formatDate } from '@/utils/date';

const PAYMENT_METHODS = ['UPI', 'BANK_TRANSFER', 'CARD'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Scheme detail + installment schedule, and a real "Pay Installment"
 * mutation wired to customerPortal.schemes.payInstallment.
 * Fetches via customerPortal.schemes.get which expects { id }.
 */
export default function SchemeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const schemeId = id ?? '';

  const [showPay, setShowPay] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('UPI');

  const schemeQuery = trpc.customerPortal.schemes.get.useQuery(
    { id: schemeId },
    { enabled: !!schemeId },
  );

  const payMutation = trpc.customerPortal.schemes.payInstallment.useMutation({
    onSuccess: () => {
      setShowPay(false);
      schemeQuery.refetch();
      Alert.alert(
        'Payment Submitted',
        'Your installment payment has been recorded.',
      );
    },
    onError: (err) => {
      Alert.alert('Payment failed', err.message);
    },
  });

  const scheme = schemeQuery.data;

  const handlePay = () => {
    if (!schemeId) return;
    payMutation.mutate({
      membershipId: schemeId,
      paymentMethod,
    });
  };

  const paidInstallments =
    scheme?.installments.filter((i) => i.status === 'PAID').length ?? 0;
  const totalInstallments = scheme?.installments.length ?? 0;
  const nextDue = scheme?.installments.find(
    (i) => i.status === 'PENDING' || i.status === 'OVERDUE',
  );
  const remainingPaise =
    scheme && scheme.maturityValuePaise
      ? Math.max(
          Number(scheme.maturityValuePaise) - Number(scheme.totalPaidPaise),
          0,
        )
      : Math.max(
          Number(scheme?.monthlyAmountPaise ?? 0) *
            (totalInstallments - paidInstallments),
          0,
        );

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen
        options={{
          headerShown: true,
          title: scheme?.schemeName ?? 'Scheme Details',
        }}
      />

      <Screen
        loading={schemeQuery.isLoading}
        error={schemeQuery.error?.message}
        scrollable
      >
        {scheme && (
          <>
            {/* Overview */}
            <Card className="mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-bold text-surface-900">
                  {scheme.schemeName}
                </Text>
                <Badge
                  label={scheme.status}
                  variant={getStatusVariant(scheme.status)}
                />
              </View>

              {/* Progress */}
              <View className="h-3 bg-surface-200 rounded-full mb-3">
                <View
                  className="h-3 bg-primary-400 rounded-full"
                  style={{
                    width: `${Math.min(
                      totalInstallments > 0
                        ? (paidInstallments / totalInstallments) * 100
                        : 0,
                      100,
                    )}%`,
                  }}
                />
              </View>

              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Paid</Text>
                <MoneyDisplay
                  amountPaise={Number(scheme.totalPaidPaise)}
                  className="text-sm font-semibold text-green-600"
                />
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Remaining</Text>
                <MoneyDisplay
                  amountPaise={remainingPaise}
                  className="text-sm font-semibold text-surface-900"
                />
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Per Installment</Text>
                <MoneyDisplay
                  amountPaise={Number(scheme.monthlyAmountPaise)}
                  className="text-sm text-surface-700"
                />
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Progress</Text>
                <Text className="text-sm text-surface-700">
                  {paidInstallments} / {totalInstallments}
                </Text>
              </View>
              {scheme.maturityDate && (
                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-surface-600">Maturity</Text>
                  <Text className="text-sm text-surface-700">
                    {formatDate(scheme.maturityDate)}
                  </Text>
                </View>
              )}
              {scheme.maturityValuePaise != null &&
                Number(scheme.maturityValuePaise) > 0 && (
                  <View className="flex-row justify-between py-1 border-t border-surface-200 mt-1">
                    <Text className="text-sm font-semibold text-surface-700">
                      Maturity Value
                    </Text>
                    <MoneyDisplay
                      amountPaise={Number(scheme.maturityValuePaise)}
                      className="text-sm font-bold text-primary-500"
                    />
                  </View>
                )}
            </Card>

            {/* Next Due + Pay */}
            {nextDue && (
              <Card className="mb-4 bg-amber-50 border-amber-200">
                <Text className="text-sm text-amber-700 font-medium">
                  Next installment #{nextDue.installmentNumber} due:{' '}
                  {formatDate(nextDue.dueDate)}
                </Text>
                <MoneyDisplay
                  amountPaise={Number(nextDue.amountPaise)}
                  className="text-lg font-bold text-amber-800 mt-1"
                />
                {!showPay ? (
                  <Button
                    title="Pay Installment"
                    size="sm"
                    onPress={() => setShowPay(true)}
                    style={{ marginTop: 12 }}
                  />
                ) : (
                  <View className="mt-3">
                    <Text className="text-xs text-surface-600 mb-2">
                      Choose payment method:
                    </Text>
                    <View className="flex-row flex-wrap gap-2 mb-3">
                      {PAYMENT_METHODS.map((m) => (
                        <Pressable
                          key={m}
                          onPress={() => setPaymentMethod(m)}
                          className={`px-3 py-1.5 rounded-full ${
                            paymentMethod === m
                              ? 'bg-primary-400'
                              : 'bg-surface-200'
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              paymentMethod === m
                                ? 'text-white'
                                : 'text-surface-700'
                            }`}
                          >
                            {m.replace('_', ' ')}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Button
                      title="Confirm Payment"
                      size="sm"
                      onPress={handlePay}
                      loading={payMutation.isPending}
                    />
                    <Button
                      title="Cancel"
                      size="sm"
                      variant="secondary"
                      onPress={() => setShowPay(false)}
                      style={{ marginTop: 8 }}
                    />
                  </View>
                )}
              </Card>
            )}

            {/* Installment History */}
            <Card className="mb-4">
              <Text className="text-sm font-semibold text-surface-700 mb-2">
                Installment Schedule
              </Text>
              {scheme.installments.length === 0 ? (
                <Text className="text-sm text-surface-400 text-center py-4">
                  No installments recorded yet
                </Text>
              ) : (
                scheme.installments.map((inst) => (
                  <View
                    key={inst.id}
                    className="flex-row items-center justify-between py-2.5 border-b border-surface-100"
                  >
                    <View>
                      <Text className="text-sm text-surface-800">
                        Installment #{inst.installmentNumber}
                      </Text>
                      <Text className="text-xs text-surface-500">
                        Due: {formatDate(inst.dueDate)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <MoneyDisplay
                        amountPaise={Number(inst.amountPaise)}
                        className="text-sm text-surface-700"
                      />
                      <Badge
                        label={inst.status}
                        variant={getStatusVariant(inst.status)}
                        size="sm"
                      />
                    </View>
                  </View>
                ))
              )}
            </Card>
          </>
        )}
      </Screen>
    </SafeAreaView>
  );
}
