import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useApiQuery } from '@/hooks/useApi';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { formatDate } from '@/utils/date';

interface Customer360 {
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    customerType: string;
    city: string | null;
    dateOfBirth: string | null;
    anniversary: string | null;
    createdAt: string;
  };
  loyalty: {
    currentPoints: number;
    tier: string | null;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
  };
  purchaseHistory: Array<{
    id: string;
    invoiceNumber?: string;
    totalPaise: number;
    date: string;
    itemCount: number;
  }>;
  occasions: Array<{
    id: string;
    occasionType: string;
    date: string;
    description: string | null;
  }>;
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error } = useApiQuery<Customer360>(
    ['sales', 'customer', id],
    `/api/v1/crm/customers/${id}/360`,
  );

  const customer = data;
  const fullName = customer
    ? `${customer.profile.firstName} ${customer.profile.lastName}`
    : '';

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <Stack.Screen
        options={{ headerShown: true, title: fullName || 'Customer' }}
      />

      <Screen
        loading={isLoading}
        error={error?.message}
        scrollable
      >
        {customer && (
          <>
            {/* Profile Header */}
            <Card className="mb-4 items-center">
              <Avatar name={fullName} size="lg" />
              <Text className="text-lg font-bold text-surface-900 mt-2">
                {fullName}
              </Text>
              <Text className="text-sm text-surface-500">
                {customer.profile.phone ?? 'No phone'}
              </Text>
              {customer.profile.email && (
                <Text className="text-xs text-surface-400">
                  {customer.profile.email}
                </Text>
              )}
              <View className="flex-row gap-2 mt-2">
                <Badge label={customer.profile.customerType} variant="info" />
                {customer.loyalty.tier && (
                  <Badge label={customer.loyalty.tier} variant="gold" />
                )}
              </View>
            </Card>

            {/* Loyalty */}
            <Card className="mb-4">
              <Text className="text-sm font-semibold text-surface-700 mb-2">
                Loyalty
              </Text>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Current Points</Text>
                <Text className="text-sm font-semibold text-surface-900">
                  {customer.loyalty.currentPoints}
                </Text>
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Lifetime Earned</Text>
                <Text className="text-sm text-surface-700">
                  {customer.loyalty.lifetimeEarned}
                </Text>
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-sm text-surface-600">Redeemed</Text>
                <Text className="text-sm text-surface-700">
                  {customer.loyalty.lifetimeRedeemed}
                </Text>
              </View>
            </Card>

            {/* Purchase History */}
            <Card className="mb-4">
              <Text className="text-sm font-semibold text-surface-700 mb-2">
                Recent Purchases
              </Text>
              {customer.purchaseHistory.slice(0, 10).map((purchase) => (
                <View
                  key={purchase.id}
                  className="flex-row items-center justify-between py-2 border-b border-surface-100"
                >
                  <View>
                    <Text className="text-sm text-surface-800">
                      {purchase.invoiceNumber ?? 'N/A'}
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
              ))}
              {customer.purchaseHistory.length === 0 && (
                <Text className="text-sm text-surface-400 text-center py-3">
                  No purchase history
                </Text>
              )}
            </Card>

            {/* Occasions */}
            <Card className="mb-4">
              <Text className="text-sm font-semibold text-surface-700 mb-2">
                Occasions
              </Text>
              {customer.occasions.map((occasion) => (
                <View
                  key={occasion.id}
                  className="flex-row items-center justify-between py-2 border-b border-surface-100"
                >
                  <View>
                    <Badge
                      label={occasion.occasionType}
                      variant="info"
                      size="sm"
                    />
                    {occasion.description && (
                      <Text className="text-xs text-surface-500 mt-1">
                        {occasion.description}
                      </Text>
                    )}
                  </View>
                  <Text className="text-xs text-surface-600">
                    {formatDate(occasion.date)}
                  </Text>
                </View>
              ))}
              {customer.occasions.length === 0 && (
                <Text className="text-sm text-surface-400 text-center py-3">
                  No occasions recorded
                </Text>
              )}
            </Card>
          </>
        )}
      </Screen>
    </SafeAreaView>
  );
}
