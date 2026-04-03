import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useApiQuery } from '@/hooks/useApi';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { useAuthStore } from '@/store/auth-store';
import { formatMoney } from '@/utils/money';

interface CustomerHomeData {
  loyaltyTier: string | null;
  loyaltyPoints: number;
  goldRatePer10g: number;
  silverRatePer10g: number;
  activeSchemes: number;
  wishlistCount: number;
  recommendations: Array<{
    id: string;
    name: string;
    productType: string;
    pricePaise: number;
    imageUrl: string | null;
  }>;
}

export default function CustomerHomeScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useApiQuery<CustomerHomeData>(
    ['customer', 'home', user?.id],
    '/api/v1/crm/customer-home',
    { customerId: user?.id },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const home = data ?? {
    loyaltyTier: null,
    loyaltyPoints: 0,
    goldRatePer10g: 0,
    silverRatePer10g: 0,
    activeSchemes: 0,
    wishlistCount: 0,
    recommendations: [],
  };

  const tierVariant = (tier: string | null) => {
    switch (tier) {
      case 'GOLD': return 'gold' as const;
      case 'SILVER': return 'silver' as const;
      case 'PLATINUM':
      case 'DIAMOND': return 'platinum' as const;
      default: return 'default' as const;
    }
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
        {/* Welcome */}
        <View className="mb-5">
          <Text className="text-sm text-surface-500">Welcome,</Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl font-bold text-surface-900">
              {user?.firstName ?? 'Customer'}
            </Text>
            {home.loyaltyTier && (
              <Badge
                label={home.loyaltyTier}
                variant={tierVariant(home.loyaltyTier)}
                size="md"
              />
            )}
          </View>
          <Text className="text-xs text-surface-400 mt-1">
            {home.loyaltyPoints} loyalty points
          </Text>
        </View>

        {/* Gold Rate Ticker */}
        <Card className="mb-4 bg-primary-50 border-primary-200">
          <Text className="text-xs text-primary-600 font-medium mb-1">
            Today's Rates (per 10g)
          </Text>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-xs text-surface-500">Gold</Text>
              <Text className="text-lg font-bold text-primary-600">
                {home.goldRatePer10g > 0
                  ? formatMoney(home.goldRatePer10g)
                  : '--'}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-surface-500">Silver</Text>
              <Text className="text-lg font-bold text-surface-700">
                {home.silverRatePer10g > 0
                  ? formatMoney(home.silverRatePer10g)
                  : '--'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Links */}
        <View className="flex-row gap-3 mb-4">
          <Card
            className="flex-1 items-center"
            onPress={() => router.push('/(customer)/passbook')}
          >
            <Text className="text-2xl mb-1">{'📗'}</Text>
            <Text className="text-xs font-medium text-surface-700">
              Schemes
            </Text>
            <Text className="text-xs text-primary-500">
              {home.activeSchemes} active
            </Text>
          </Card>
          <Card
            className="flex-1 items-center"
            onPress={() => router.push('/(customer)/passbook/loyalty' as never)}
          >
            <Text className="text-2xl mb-1">{'🏆'}</Text>
            <Text className="text-xs font-medium text-surface-700">
              Loyalty
            </Text>
            <Text className="text-xs text-primary-500">
              {home.loyaltyPoints} pts
            </Text>
          </Card>
          <Card
            className="flex-1 items-center"
            onPress={() => router.push('/(customer)/catalog')}
          >
            <Text className="text-2xl mb-1">{'💎'}</Text>
            <Text className="text-xs font-medium text-surface-700">
              Catalog
            </Text>
          </Card>
        </View>

        {/* Recommendations */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-3">
            Recommended for You
          </Text>
          {home.recommendations.length > 0 ? (
            home.recommendations.slice(0, 5).map((product) => (
              <Pressable
                key={product.id}
                className="flex-row items-center justify-between py-2.5 border-b border-surface-100"
                onPress={() =>
                  router.push(`/(customer)/catalog/${product.id}` as never)
                }
              >
                <View>
                  <Text className="text-sm font-medium text-surface-800">
                    {product.name}
                  </Text>
                  <Text className="text-xs text-surface-500">
                    {product.productType}
                  </Text>
                </View>
                <MoneyDisplay
                  amountPaise={product.pricePaise}
                  className="text-sm font-semibold text-primary-500"
                />
              </Pressable>
            ))
          ) : (
            <Text className="text-sm text-surface-400 text-center py-4">
              Browse our catalog to discover beautiful jewelry
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
