import React, { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SearchBar } from '@/components/SearchBar';
import { DataList } from '@/components/DataList';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { MoneyDisplay } from '@/components/MoneyDisplay';
import { WeightDisplay } from '@/components/WeightDisplay';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { useApiQuery } from '@/hooks/useApi';

interface CatalogProduct {
  id: string;
  name: string;
  productType: string;
  category: string;
  sellingPricePaise: number;
  weightMg: number;
  purityFineness: number;
  imageUrl: string | null;
  isAvailable: boolean;
}

const METAL_FILTERS = ['All', 'GOLD', 'SILVER', 'PLATINUM', 'DIAMOND'];

export default function CatalogScreen() {
  const [search, setSearch] = useState('');
  const [metalFilter, setMetalFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const { data, isLoading, refetch } = useApiQuery<{
    items: CatalogProduct[];
    total: number;
  }>(
    ['customer', 'catalog', search, metalFilter, priceMin, priceMax],
    '/api/v1/ecommerce/catalog',
    {
      search: search || undefined,
      productType: metalFilter !== 'All' ? metalFilter : undefined,
      limit: 50,
    },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const products = data?.items ?? [];

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-surface-900 mb-3">
          Catalog
        </Text>
        <SearchBar
          placeholder="Search jewelry..."
          onSearch={setSearch}
        />

        {/* Metal Type Filters */}
        <View className="flex-row gap-2 mb-2">
          {METAL_FILTERS.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setMetalFilter(filter)}
              className={`px-3 py-1.5 rounded-full ${
                metalFilter === filter
                  ? 'bg-primary-400'
                  : 'bg-surface-200'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  metalFilter === filter
                    ? 'text-white'
                    : 'text-surface-700'
                }`}
              >
                {filter}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setShowFilters(true)}
            className="px-3 py-1.5 rounded-full bg-surface-200"
          >
            <Text className="text-xs font-medium text-surface-700">
              More
            </Text>
          </Pressable>
        </View>
      </View>

      <DataList
        data={products}
        keyExtractor={(item) => item.id}
        loading={isLoading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        emptyTitle="No products found"
        emptySubtitle="Try adjusting your filters"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <Card
            className="mb-3"
            onPress={() =>
              router.push(`/(customer)/catalog/${item.id}` as never)
            }
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 mr-3">
                <Text
                  className="text-sm font-semibold text-surface-900"
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <Badge label={item.productType} variant="info" size="sm" />
                  {item.category && (
                    <Text className="text-xs text-surface-500">
                      {item.category}
                    </Text>
                  )}
                </View>
                <View className="flex-row items-center gap-3 mt-1">
                  <WeightDisplay
                    milligrams={item.weightMg}
                    className="text-xs text-surface-600"
                  />
                </View>
              </View>
              <View className="items-end">
                <MoneyDisplay
                  amountPaise={item.sellingPricePaise}
                  className="text-base font-bold text-primary-500"
                />
                <Text className="text-[10px] text-surface-400 mt-0.5">
                  Live price
                </Text>
              </View>
            </View>
          </Card>
        )}
      />

      {/* Filter Bottom Sheet */}
      <BottomSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters"
      >
        <Text className="text-sm font-medium text-surface-700 mb-2">
          Price Range
        </Text>
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-xs text-surface-500 mb-1">Min</Text>
            <Pressable className="border border-surface-300 rounded-lg px-3 py-2">
              <Text className="text-sm text-surface-700">
                {priceMin || 'Any'}
              </Text>
            </Pressable>
          </View>
          <View className="flex-1">
            <Text className="text-xs text-surface-500 mb-1">Max</Text>
            <Pressable className="border border-surface-300 rounded-lg px-3 py-2">
              <Text className="text-sm text-surface-700">
                {priceMax || 'Any'}
              </Text>
            </Pressable>
          </View>
        </View>
        <Button
          title="Apply Filters"
          onPress={() => {
            setShowFilters(false);
            refetch();
          }}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}
