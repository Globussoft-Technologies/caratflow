'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number; // Amount in smallest unit (paise/cents)
  onChange: (value: number) => void;
  currencyCode?: string;
  currencySymbol?: string;
  decimalPlaces?: number;
  label?: string;
  error?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '\u20B9',
  USD: '$',
  AED: '\u062F.\u0625',
  GBP: '\u00A3',
  EUR: '\u20AC',
  SGD: 'S$',
};

export function MoneyInput({
  value,
  onChange,
  currencyCode = 'INR',
  currencySymbol,
  decimalPlaces = 2,
  label,
  error,
  className,
  disabled,
  ...props
}: MoneyInputProps) {
  const symbol = currencySymbol ?? CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
  const divisor = Math.pow(10, decimalPlaces);
  const [displayValue, setDisplayValue] = React.useState(
    (value / divisor).toFixed(decimalPlaces),
  );

  React.useEffect(() => {
    setDisplayValue((value / divisor).toFixed(decimalPlaces));
  }, [value, divisor, decimalPlaces]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    // Allow only one decimal point
    const parts = raw.split('.');
    const cleaned = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : raw;
    setDisplayValue(cleaned);

    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      onChange(Math.round(parsed * divisor));
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(displayValue);
    if (isNaN(parsed)) {
      setDisplayValue('0.00');
      onChange(0);
    } else {
      setDisplayValue(parsed.toFixed(decimalPlaces));
      onChange(Math.round(parsed * divisor));
    }
  };

  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium leading-none">{label}</label>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {symbol}
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent py-1 pr-3 text-right text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            symbol.length > 2 ? 'pl-12' : 'pl-8',
            error && 'border-destructive focus-visible:ring-destructive',
            className,
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
