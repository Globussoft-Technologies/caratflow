import React from 'react';
import { View, Text, Image, type ImageSourcePropType } from 'react-native';

interface AvatarProps {
  name: string;
  imageUri?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-14 h-14', text: 'text-lg' },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-primary-400',
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-amber-500',
    'bg-teal-500',
    'bg-indigo-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length]!;
}

export function Avatar({ name, imageUri, size = 'md' }: AvatarProps) {
  const s = sizeMap[size];

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        className={`${s.container} rounded-full`}
      />
    );
  }

  return (
    <View
      className={`${s.container} rounded-full items-center justify-center ${getColorFromName(name)}`}
    >
      <Text className={`${s.text} font-semibold text-white`}>
        {getInitials(name)}
      </Text>
    </View>
  );
}
