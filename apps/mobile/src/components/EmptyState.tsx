import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      {icon && <View className="mb-4">{icon}</View>}
      <Text className="text-lg font-semibold text-surface-700 text-center">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-sm text-surface-500 text-center mt-2">
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <View className="mt-6">
          <Button title={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      )}
    </View>
  );
}
