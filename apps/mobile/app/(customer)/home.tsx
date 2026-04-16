import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { useAuthStore } from '@/store/auth-store';
import { formatMoney } from '@/utils/money';

/**
 * Customer Home
 * ------------------------------------------------------------------
 * Pulls real-time storefront homepage (featured products, new arrivals,
 * live metal rates) plus the authenticated customer's loyalty + scheme
 * summary from the customerPortal dashboard. No more dead REST.
 */
export default function CustomerHomeScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const storefrontHome = trpc.storefront.home.useQuery();
  const dashboard = trpc.customerPortal.dashboard.useQuery();

  const isLoading = storefrontHome.isLoading || dashboard.isLoading;
  const home = storefrontHome.data;
  const dash = dashboard.data;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([storefrontHome.refetch(), dashboard.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [storefrontHome, dashboard]);

  const tierVariant = (tier: string | null | undefined) => {
    switch (tier) {
      case 'GOLD':
        return 'gold' as const;
      case 'SILVER':
        return 'silver' as const;
      case 'PLATINUM':
      case 'DIAMOND':
        return 'platinum' as const;
      default:
        return 'default' as const;
    }
  };

  const goldRate =
    home?.liveRates?.find(
      (r) => r.metalType === 'GOLD' && r.purity === 916,
    ) ?? home?.liveRates?.find((r) => r.metalType === 'GOLD');
  const silverRate = home?.liveRates?.find((r) => r.metalType === 'SILVER');

  const recommendations = [
    ...(home?.featuredProducts ?? []),
    ...(home?.newArrivals ?? []),
  ].slice(0, 5);

  if (isLoading && !home && !dash) {
    return (
      <SafeAreaView className="flex-1 bg-surface-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#d4af37" />
          <Text className="mt-3 text-surface-500 text-sm">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text className="text-sm text-surface-500">
            {dash?.greeting ? dash.greeting.split(',')[0] : 'Welcome,'}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl font-bold text-surface-900">
              {user?.firstName ?? 'Customer'}
            </Text>
            {dash?.loyalty?.tier && (
              <Badge
                label={dash.loyalty.tier}
                variant={tierVariant(dash.loyalty.tier)}
                size="md"
              />
            )}
          </View>
          <Text className="text-xs text-surface-400 mt-1">
            {dash?.loyalty?.currentPoints ?? 0} loyalty points
          </Text>
        </View>

        {/* Gold Rate Ticker */}
        <Card className="mb-4 bg-primary-50 border-primary-200">
          <Text className="text-xs text-primary-600 font-medium mb-1">
            Today's Rates (per 10g)
          </Text>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-xs text-surface-500">
                Gold{goldRate ? ` (${goldRate.purity})` : ''}
              </Text>
              <Text className="text-lg font-bold text-primary-600">
                {goldRate ? formatMoney(goldRate.ratePaisePer10g) : '--'}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-surface-500">Silver</Text>
              <Text className="text-lg font-bold text-surface-700">
                {silverRate ? formatMoney(silverRate.ratePaisePer10g) : '--'}
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
            <Text className="text-xs font-medium text-surface-700">Schemes</Text>
            <Text className="text-xs text-primary-500">
              {dash?.activeSchemesCount ?? 0} active
            </Text>
          </Card>
          <Card
            className="flex-1 items-center"
            onPress={() => router.push('/(customer)/passbook/loyalty' as never)}
          >
            <Text className="text-2xl mb-1">{'🏆'}</Text>
            <Text className="text-xs font-medium text-surface-700">Loyalty</Text>
            <Text className="text-xs text-primary-500">
              {dash?.loyalty?.currentPoints ?? 0} pts
            </Text>
          </Card>
          <Card
            className="flex-1 items-center"
            onPress={() => router.push('/(customer)/catalog')}
          >
            <Text className="text-2xl mb-1">{'💎'}</Text>
            <Text className="text-xs font-medium text-surface-700">Catalog</Text>
            {dash?.wishlistCount ? (
              <Text className="text-xs text-primary-500">
                {dash.wishlistCount} wishlist
              </Text>
            ) : null}
          </Card>
        </View>

        {/* Recommendations */}
        <Card className="mb-4">
          <Text className="text-sm font-semibold text-surface-700 mb-3">
            Recommended for You
          </Text>
          {recommendations.length > 0 ? (
            recommendations.map((product) => (
              <Pressable
                key={product.id}
                className="flex-row items-center justify-between py-2.5 border-b border-surface-100"
                onPress={() =>
                  router.push(`/(customer)/catalog/${product.id}` as never)
                }
              >
                <View className="flex-1 mr-3">
                  <Text
                    className="text-sm font-medium text-surface-800"
                    numberOfLines={1}
                  >
                    {product.name}
                  </Text>
                  <Text className="text-xs text-surface-500">
                    {product.productType}
                  </Text>
                </View>
                <MoneyDisplay
                  amountPaise={Number(product.totalPricePaise)}
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
