import React from 'react';
import { View, Text } from 'react-native';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'gold'
  | 'silver'
  | 'platinum';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'bg-surface-200', text: 'text-surface-700' },
  success: { bg: 'bg-green-100', text: 'text-green-700' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700' },
  danger: { bg: 'bg-red-100', text: 'text-red-700' },
  info: { bg: 'bg-blue-100', text: 'text-blue-700' },
  gold: { bg: 'bg-primary-100', text: 'text-primary-700' },
  silver: { bg: 'bg-gray-200', text: 'text-gray-600' },
  platinum: { bg: 'bg-slate-200', text: 'text-slate-700' },
};

export function Badge({ label, variant = 'default', size = 'sm' }: BadgeProps) {
  const v = variantStyles[variant];
  const sizeClass = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <View className={`${v.bg} ${sizeClass} rounded-full self-start`}>
      <Text className={`${v.text} ${textSize} font-medium`}>{label}</Text>
    </View>
  );
}

/** Maps common statuses to badge variants */
export function getStatusVariant(status: string): BadgeVariant {
  const s = status.toUpperCase();
  if (['COMPLETED', 'DELIVERED', 'APPROVED', 'PAID', 'ACTIVE', 'PASSED'].includes(s))
    return 'success';
  if (['PENDING', 'DRAFT', 'IN_TRANSIT', 'PROCESSING', 'IN_PROGRESS'].includes(s))
    return 'warning';
  if (['CANCELLED', 'REJECTED', 'FAILED', 'VOIDED', 'OVERDUE'].includes(s))
    return 'danger';
  if (['READY', 'CONFIRMED', 'DISPATCHED'].includes(s)) return 'info';
  return 'default';
}
