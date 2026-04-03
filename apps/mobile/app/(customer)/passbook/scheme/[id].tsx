import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApiQuery } from '@/hooks/useApi';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Badge, getStatusVariant } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { formatDate } from '@/utils/date';

interface SchemeDetail {
  id: string;
  type: string;
  schemeName: string;
  status: string;
  totalAmountPaise: number;
  paidAmountPaise: number;
  remainingAmountPaise: number;
  installmentAmountPaise: number;
  installmentsPaid: number;
  totalInstallments: number;
  startDate: string;
  maturityDate: string | null;
  nextDueDate: string | null;
  maturityValuePaise: number;
  installments: Array<{
    id: string;
    installmentNumber: number;
    amountPaise: number;
    paidDate: string | null;
    dueDate: string;
    status: string;
  }>;
}

export default function SchemeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error } = useApiQuery<SchemeDetail>(
    ['customer', 'scheme', id],
    `/api/v1/crm/schemes/${id}`,
  );

  const scheme = data;

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen
        options={{
          headerShown: true,
          title: scheme?.schemeName ?? 'Scheme Details',
        }}
      />

      <Screen loading={isLoading} error={error?.message} scrollable>
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
                      (scheme.installmentsPaid / scheme.totalInstallments) * 100,
                      100,
                    )}%`,
                  }}
                />
              </View>

              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Paid</Text>
                <MoneyDisplay
                  amountPaise={scheme.paidAmountPaise}
                  className="text-sm font-semibold text-green-600"
                />
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Remaining</Text>
                <MoneyDisplay
                  amountPaise={scheme.remainingAmountPaise}
                  className="text-sm font-semibold text-surface-900"
                />
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Per Installment</Text>
                <MoneyDisplay
                  amountPaise={scheme.installmentAmountPaise}
                  className="text-sm text-surface-700"
                />
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Progress</Text>
                <Text className="text-sm text-surface-700">
                  {scheme.installmentsPaid} / {scheme.totalInstallments}
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
              {scheme.maturityValuePaise > 0 && (
                <View className="flex-row justify-between py-1 border-t border-surface-200 mt-1">
                  <Text className="text-sm font-semibold text-surface-700">
                    Maturity Value
                  </Text>
                  <MoneyDisplay
                    amountPaise={scheme.maturityValuePaise}
                    className="text-sm font-bold text-primary-500"
                  />
                </View>
              )}
            </Card>

            {/* Next Due */}
            {scheme.nextDueDate && (
              <Card className="mb-4 bg-amber-50 border-amber-200">
                <Text className="text-sm text-amber-700 font-medium">
                  Next installment due: {formatDate(scheme.nextDueDate)}
                </Text>
                <MoneyDisplay
                  amountPaise={scheme.installmentAmountPaise}
                  className="text-lg font-bold text-amber-800 mt-1"
                />
              </Card>
            )}

            {/* Installment History */}
            <Card className="mb-4">
              <Text className="text-sm font-semibold text-surface-700 mb-2">
                Installment Schedule
              </Text>
              {scheme.installments.map((inst) => (
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
                      amountPaise={inst.amountPaise}
                      className="text-sm text-surface-700"
                    />
                    <Badge
                      label={inst.status}
                      variant={getStatusVariant(inst.status)}
                      size="sm"
                    />
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}
      </Screen>
    </SafeAreaView>
  );
}
