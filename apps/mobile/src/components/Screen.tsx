// ─── Screen: Safe area wrapper with loading/error states ────────

import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  children: React.ReactNode;
  /** Show a loading spinner instead of children */
  loading?: boolean;
  /** Show an error message instead of children */
  error?: string | null;
  /** Enable scroll with pull-to-refresh */
  scrollable?: boolean;
  /** Pull-to-refresh handler */
  onRefresh?: () => void;
  /** Whether a refresh is in progress */
  refreshing?: boolean;
  /** Additional style for the safe area container */
  style?: ViewStyle;
  /** Padding mode */
  padded?: boolean;
}

export function Screen({
  children,
  loading = false,
  error = null,
  scrollable = false,
  onRefresh,
  refreshing = false,
  style,
  padded = true,
}: ScreenProps) {
  const content = loading ? (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#d4af37" />
      <Text className="mt-3 text-surface-500 text-sm">Loading...</Text>
    </View>
  ) : error ? (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-red-500 text-base font-medium text-center">
        {error}
      </Text>
    </View>
  ) : scrollable ? (
    <ScrollView
      className="flex-1"
      contentContainerStyle={padded ? { padding: 16 } : undefined}
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
    >
      {children}
    </ScrollView>
  ) : (
    <View className={`flex-1 ${padded ? 'p-4' : ''}`}>{children}</View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" style={style}>
      {content}
    </SafeAreaView>
  );
}
