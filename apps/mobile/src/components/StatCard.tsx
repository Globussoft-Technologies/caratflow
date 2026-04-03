import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  /** Percentage change indicator */
  trend?: number;
  onPress?: () => void;
  icon?: React.ReactNode;
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  onPress,
  icon,
}: StatCardProps) {
  const content = (
    <>
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-xs text-surface-500 uppercase tracking-wide">
          {title}
        </Text>
        {icon}
      </View>
      <Text className="text-xl font-bold text-surface-900" numberOfLines={1}>
        {value}
      </Text>
      <View className="flex-row items-center mt-1">
        {trend !== undefined && (
          <Text
            className={`text-xs font-medium ${
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend >= 0 ? '+' : ''}
            {trend.toFixed(1)}%
          </Text>
        )}
        {subtitle && (
          <Text className="text-xs text-surface-500 ml-1">{subtitle}</Text>
        )}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        className="bg-white rounded-xl border border-surface-200 p-4 flex-1 active:bg-surface-50"
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View className="bg-white rounded-xl border border-surface-200 p-4 flex-1">
      {content}
    </View>
  );
}
