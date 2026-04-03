import React from 'react';
import { View, Pressable, type ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  className?: string;
}

export function Card({ children, onPress, style, className = '' }: CardProps) {
  const base = `bg-white rounded-xl border border-surface-200 p-4 ${className}`;

  if (onPress) {
    return (
      <Pressable
        className={`${base} active:bg-surface-50`}
        onPress={onPress}
        style={style}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={base} style={style}>
      {children}
    </View>
  );
}
