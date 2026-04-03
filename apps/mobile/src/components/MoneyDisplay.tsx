import React from 'react';
import { Text, type TextStyle } from 'react-native';
import { formatMoney, formatMoneyShort } from '@/utils/money';

interface MoneyDisplayProps {
  amountPaise: number;
  currencyCode?: string;
  /** Use abbreviated format (e.g., 1.5L) */
  short?: boolean;
  style?: TextStyle;
  className?: string;
}

export function MoneyDisplay({
  amountPaise,
  currencyCode = 'INR',
  short = false,
  style,
  className = 'text-base font-semibold text-surface-900',
}: MoneyDisplayProps) {
  const formatted = short
    ? formatMoneyShort(amountPaise, currencyCode)
    : formatMoney(amountPaise, currencyCode);

  return (
    <Text className={className} style={style}>
      {formatted}
    </Text>
  );
}
