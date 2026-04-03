'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

type WeightUnitOption = 'g' | 'mg' | 'kg' | 'ct' | 'tola' | 'troy_oz';

interface WeightInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  /** Value in milligrams */
  value: number;
  onChange: (milligrams: number) => void;
  unit?: WeightUnitOption;
  onUnitChange?: (unit: WeightUnitOption) => void;
  showConversion?: boolean;
  label?: string;
  error?: string;
}

const UNIT_FACTORS: Record<WeightUnitOption, number> = {
  mg: 1,
  g: 1000,
  kg: 1_000_000,
  ct: 200,
  tola: 11_664,
  troy_oz: 31_103.4768,
};

const UNIT_LABELS: Record<WeightUnitOption, string> = {
  mg: 'mg',
  g: 'g',
  kg: 'kg',
  ct: 'ct',
  tola: 'tola',
  troy_oz: 'troy oz',
};

export function WeightInput({
  value,
  onChange,
  unit = 'g',
  onUnitChange,
  showConversion = true,
  label,
  error,
  className,
  disabled,
  ...props
}: WeightInputProps) {
  const factor = UNIT_FACTORS[unit];
  const displayValue = React.useMemo(() => {
    const val = value / factor;
    return val % 1 === 0 ? val.toString() : val.toFixed(3);
  }, [value, factor]);

  const [inputValue, setInputValue] = React.useState(displayValue);

  React.useEffect(() => {
    setInputValue(displayValue);
  }, [displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setInputValue(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(Math.round(parsed * factor));
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed)) {
      setInputValue('0');
      onChange(0);
    } else {
      onChange(Math.round(parsed * factor));
    }
  };

  // Conversion display
  const conversions = React.useMemo(() => {
    if (!showConversion || value === 0) return null;
    const others: WeightUnitOption[] = ['g', 'ct', 'tola', 'troy_oz'];
    return others
      .filter((u) => u !== unit)
      .slice(0, 2)
      .map((u) => {
        const converted = value / UNIT_FACTORS[u];
        return `${converted.toFixed(3)} ${UNIT_LABELS[u]}`;
      })
      .join(' | ');
  }, [value, unit, showConversion]);

  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium leading-none">{label}</label>}
      <div className="flex gap-1">
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full rounded-l-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive',
            className,
          )}
          {...props}
        />
        <select
          value={unit}
          onChange={(e) => onUnitChange?.(e.target.value as WeightUnitOption)}
          disabled={disabled || !onUnitChange}
          className="h-9 rounded-r-md border border-l-0 border-input bg-muted px-2 text-sm"
        >
          {Object.entries(UNIT_LABELS).map(([key, lbl]) => (
            <option key={key} value={key}>
              {lbl}
            </option>
          ))}
        </select>
      </div>
      {conversions && (
        <p className="text-xs text-muted-foreground">{conversions}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
