import React, { useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SearchBar } from '@/components/SearchBar';
import { DataList } from '@/components/DataList';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { trpc } from '@/lib/trpc';

interface CustomerListItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  customerType: string;
  loyaltyTier: string | null;
  loyaltyPoints: number;
  lastPurchaseDate: string | null;
}

export default function CustomersScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = trpc.crm.customerList.useQuery({
    search: search || undefined,
    limit: 50,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const customers = ((data as { items?: CustomerListItem[] } | undefined)?.items ?? []) as CustomerListItem[];

  const tierVariant = (tier: string | null) => {
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

  return (
    <SafeAreaView className="flex-1 bg-surface-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-surface-900 mb-3">
          Customers
        </Text>
        <SearchBar
          placeholder="Search by name or phone..."
          onSearch={setSearch}
        />
      </View>

      <DataList
        data={customers}
        keyExtractor={(item) => item.id}
        loading={isLoading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        emptyTitle="No customers found"
        emptySubtitle="Try a different search term"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <Card
            className="mb-2"
            onPress={() =>
              router.push(`/(sales)/customers/${item.id}` as never)
            }
          >
            <View className="flex-row items-center">
              <Avatar
                name={`${item.firstName} ${item.lastName}`}
                size="md"
              />
              <View className="flex-1 ml-3">
                <Text className="text-sm font-semibold text-surface-900">
                  {item.firstName} {item.lastName}
                </Text>
                <Text className="text-xs text-surface-500">
                  {item.phone ?? 'No phone'}
                </Text>
              </View>
              <View className="items-end">
                {item.loyaltyTier && (
                  <Badge
                    label={item.loyaltyTier}
                    variant={tierVariant(item.loyaltyTier)}
                    size="sm"
                  />
                )}
                <Text className="text-xs text-surface-400 mt-1">
                  {item.loyaltyPoints} pts
                </Text>
              </View>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
