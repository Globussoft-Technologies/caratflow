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
import { Input } from '@/components/Input';
import { trpc } from '@/lib/trpc';

const METAL_FILTERS = ['All', 'GOLD', 'SILVER', 'PLATINUM', 'DIAMOND'] as const;
type MetalFilter = (typeof METAL_FILTERS)[number];

/**
 * Catalog list powered by storefront.catalog.list tRPC. Replaces the
 * non-existent /ecommerce/catalog REST call.
 */
export default function CatalogScreen() {
  const [search, setSearch] = useState('');
  const [metalFilter, setMetalFilter] = useState<MetalFilter>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [appliedPriceMin, setAppliedPriceMin] = useState<number | undefined>();
  const [appliedPriceMax, setAppliedPriceMax] = useState<number | undefined>();

  const productsQuery = trpc.storefront.catalog.list.useQuery({
    search: search || undefined,
    productType: metalFilter !== 'All' ? metalFilter : undefined,
    priceMinPaise: appliedPriceMin,
    priceMaxPaise: appliedPriceMax,
    limit: 20,
    page: 1,
    sortOrder: 'desc',
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await productsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [productsQuery]);

  const products =
    (productsQuery.data as { items?: unknown[] } | undefined)?.items ?? [];

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
        <View className="flex-row gap-2 mb-2 flex-wrap">
          {METAL_FILTERS.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setMetalFilter(filter)}
              className={`px-3 py-1.5 rounded-full ${
                metalFilter === filter ? 'bg-primary-400' : 'bg-surface-200'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  metalFilter === filter ? 'text-white' : 'text-surface-700'
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
            <Text className="text-xs font-medium text-surface-700">More</Text>
          </Pressable>
        </View>
      </View>

      <DataList
        data={products as Array<Record<string, unknown>>}
        keyExtractor={(item) => (item as { id: string }).id}
        loading={productsQuery.isLoading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        emptyTitle="No products found"
        emptySubtitle="Try adjusting your filters"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => {
          const p = item as {
            id: string;
            name: string;
            productType: string;
            categoryName: string | null;
            totalPricePaise: number | string;
            netWeightMg: number | null;
            grossWeightMg: number | null;
            metalWeightMg: number | null;
            stockStatus: string;
          };
          const weight =
            p.netWeightMg ?? p.grossWeightMg ?? p.metalWeightMg ?? 0;
          return (
            <Card
              className="mb-3"
              onPress={() =>
                router.push(`/(customer)/catalog/${p.id}` as never)
              }
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                  <Text
                    className="text-sm font-semibold text-surface-900"
                    numberOfLines={2}
                  >
                    {p.name}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <Badge label={p.productType} variant="info" size="sm" />
                    {p.categoryName && (
                      <Text className="text-xs text-surface-500">
                        {p.categoryName}
                      </Text>
                    )}
                  </View>
                  <View className="flex-row items-center gap-3 mt-1">
                    <WeightDisplay
                      milligrams={Number(weight)}
                      className="text-xs text-surface-600"
                    />
                    {p.stockStatus && p.stockStatus !== 'IN_STOCK' && (
                      <Badge
                        label={p.stockStatus.replace('_', ' ')}
                        variant="default"
                        size="sm"
                      />
                    )}
                  </View>
                </View>
                <View className="items-end">
                  <MoneyDisplay
                    amountPaise={Number(p.totalPricePaise)}
                    className="text-base font-bold text-primary-500"
                  />
                  <Text className="text-[10px] text-surface-400 mt-0.5">
                    Live price
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
      />

      {/* Filter Bottom Sheet */}
      <BottomSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters"
      >
        <Text className="text-sm font-medium text-surface-700 mb-2">
          Price Range (in rupees)
        </Text>
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Input
              label="Min"
              placeholder="Any"
              value={priceMin}
              onChangeText={setPriceMin}
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <Input
              label="Max"
              placeholder="Any"
              value={priceMax}
              onChangeText={setPriceMax}
              keyboardType="numeric"
            />
          </View>
        </View>
        <Button
          title="Apply Filters"
          onPress={() => {
            const minRupees = priceMin ? parseInt(priceMin, 10) : NaN;
            const maxRupees = priceMax ? parseInt(priceMax, 10) : NaN;
            setAppliedPriceMin(
              Number.isFinite(minRupees) ? minRupees * 100 : undefined,
            );
            setAppliedPriceMax(
              Number.isFinite(maxRupees) ? maxRupees * 100 : undefined,
            );
            setShowFilters(false);
          }}
        />
        <Button
          title="Clear"
          variant="secondary"
          onPress={() => {
            setPriceMin('');
            setPriceMax('');
            setAppliedPriceMin(undefined);
            setAppliedPriceMax(undefined);
            setShowFilters(false);
          }}
          style={{ marginTop: 8 }}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}
