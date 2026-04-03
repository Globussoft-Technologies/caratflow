import React, { useCallback } from 'react';
import {
  FlatList,
  RefreshControl,
  ActivityIndicator,
  View,
  Text,
  type ListRenderItem,
} from 'react-native';
import { EmptyState } from './EmptyState';

interface DataListProps<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  ListHeaderComponent?: React.ReactElement;
  contentContainerStyle?: object;
}

export function DataList<T>({
  data,
  renderItem,
  keyExtractor,
  loading = false,
  refreshing = false,
  onRefresh,
  onEndReached,
  hasMore = false,
  emptyTitle = 'No items found',
  emptySubtitle,
  ListHeaderComponent,
  contentContainerStyle,
}: DataListProps<T>) {
  const renderFooter = useCallback(() => {
    if (!hasMore) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#d4af37" />
      </View>
    );
  }, [hasMore]);

  if (loading && data.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#d4af37" />
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#d4af37']}
            tintColor="#d4af37"
          />
        ) : undefined
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListFooterComponent={renderFooter}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={
        <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
      }
      contentContainerStyle={[
        { flexGrow: 1 },
        data.length === 0 && { flex: 1 },
        contentContainerStyle,
      ]}
    />
  );
}
