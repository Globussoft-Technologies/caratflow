import React from 'react';
import { Text, type TextStyle } from 'react-native';
import { formatWeight, type WeightUnit } from '@/utils/weight';
import { useAppStore } from '@/store/app-store';

interface WeightDisplayProps {
  milligrams: number;
  unit?: WeightUnit;
  decimalPlaces?: number;
  style?: TextStyle;
  className?: string;
}

export function WeightDisplay({
  milligrams,
  unit,
  decimalPlaces = 3,
  style,
  className = 'text-base text-surface-700',
}: WeightDisplayProps) {
  const preferredUnit = useAppStore((s) => s.weightUnit);
  const displayUnit = unit ?? preferredUnit;

  return (
    <Text className={className} style={style}>
      {formatWeight(milligrams, displayUnit, decimalPlaces)}
    </Text>
  );
}
