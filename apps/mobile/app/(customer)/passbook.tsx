import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useApiQuery } from '@/hooks/useApi';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { formatDate } from '@/utils/date';
import { useAuthStore } from '@/store/auth-store';

interface PassbookData {
  loyaltyPoints: number;
  loyaltyTier: string | null;
  schemes: Array<{
    id: string;
    type: 'GOLD_SAVINGS' | 'KITTY';
    schemeName: string;
    totalPaidPaise: number;
    totalDuePaise: number;
    installmentsPaid: number;
    totalInstallments: number;
    nextDueDate: string | null;
    status: string;
  }>;
  purchaseHistory: Array<{
    id: string;
    invoiceNumber: string;
    totalPaise: number;
    date: string;
    itemCount: number;
  }>;
}

export default function PassbookScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useApiQuery<PassbookData>(
    ['customer', 'passbook', user?.id],
    '/api/v1/crm/customer-passbook',
    { customerId: user?.id },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const passbook = data ?? {
    loyaltyPoints: 0,
    loyaltyTier: null,
    schemes: [],
    purchaseHistory: [],
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#d4af37']}
            tintColor="#d4af37"
          />
        }
      >
        <Text className="text-2xl font-bold text-surface-900 mb-4">
          Passbook
        </Text>

        {/* Loyalty Summary */}
        <Card
          className="mb-4"
          onPress={() => router.push('/(customer)/passbook/loyalty' as never)}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs text-surface-500">Loyalty Points</Text>
              <Text className="text-2xl font-bold text-primary-500">
                {passbook.loyaltyPoints}
              </Text>
            </View>
            {passbook.loyaltyTier && (
              <Badge label={passbook.loyaltyTier} variant="gold" size="md" />
            )}
          </View>
          <Text className="text-xs text-primary-400 mt-1">
            Tap to view details and history
          </Text>
        </Card>

        {/* Active Schemes */}
        <Text className="text-sm font-semibold text-surface-700 mb-2">
          My Schemes ({passbook.schemes.length})
        </Text>
        {passbook.schemes.map((scheme) => {
          const progress =
            scheme.totalInstallments > 0
              ? (scheme.installmentsPaid / scheme.totalInstallments) * 100
              : 0;
          return (
            <Card
              key={scheme.id}
              className="mb-3"
              onPress={() =>
                router.push(`/(customer)/passbook/scheme/${scheme.id}` as never)
              }
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-semibold text-surface-900">
                  {scheme.schemeName}
                </Text>
                <Badge
                  label={scheme.type.replace('_', ' ')}
                  variant="info"
                  size="sm"
                />
              </View>

              {/* Progress Bar */}
              <View className="h-2 bg-surface-200 rounded-full mb-2">
                <View
                  className="h-2 bg-primary-400 rounded-full"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </View>

              <View className="flex-row justify-between">
                <Text className="text-xs text-surface-500">
                  {scheme.installmentsPaid}/{scheme.totalInstallments} installments
                </Text>
                <MoneyDisplay
                  amountPaise={scheme.totalPaidPaise}
                  short
                  className="text-xs font-medium text-surface-700"
                />
              </View>
              {scheme.nextDueDate && (
                <Text className="text-xs text-amber-600 mt-1">
                  Next due: {formatDate(scheme.nextDueDate)}
                </Text>
              )}
            </Card>
          );
        })}
        {passbook.schemes.length === 0 && (
          <Card className="mb-4">
            <Text className="text-sm text-surface-400 text-center py-3">
              No active schemes. Ask your jeweler about savings plans.
            </Text>
          </Card>
        )}

        {/* Purchase History */}
        <Text className="text-sm font-semibold text-surface-700 mb-2 mt-2">
          Purchase History
        </Text>
        {passbook.purchaseHistory.slice(0, 15).map((purchase) => (
          <Card key={purchase.id} className="mb-2">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-medium text-surface-800">
                  {purchase.invoiceNumber}
                </Text>
                <Text className="text-xs text-surface-500">
                  {formatDate(purchase.date)} | {purchase.itemCount} items
                </Text>
              </View>
              <MoneyDisplay
                amountPaise={purchase.totalPaise}
                className="text-sm font-semibold text-surface-900"
              />
            </View>
          </Card>
        ))}
        {passbook.purchaseHistory.length === 0 && (
          <Card className="mb-4">
            <Text className="text-sm text-surface-400 text-center py-3">
              No purchases yet
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
