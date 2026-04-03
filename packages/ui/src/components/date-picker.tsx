'use client';

import * as React from 'react';
import { DayPicker, type DateRange as DayPickerDateRange } from 'react-day-picker';
import * as Popover from '@radix-ui/react-popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  label,
  error,
  disabled,
}: DatePickerProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium leading-none">{label}</label>}
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            disabled={disabled}
            className={cn(
              'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              !value && 'text-muted-foreground',
              error && 'border-destructive',
            )}
          >
            {value ? format(value, 'PPP') : placeholder}
            <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
          </button>
        </Popover.Trigger>
        <Popover.Content
          className="z-50 w-auto rounded-md border bg-background p-0 shadow-md"
          align="start"
        >
          <DayPicker
            mode="single"
            selected={value}
            onSelect={onChange}
            className="p-3"
          />
        </Popover.Content>
      </Popover.Root>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Date Range Picker ─────────────────────────────────────────

interface DateRangePickerProps {
  value?: { from: Date; to: Date };
  onChange: (range: { from: Date; to: Date } | undefined) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pick a date range',
  label,
  error,
  disabled,
}: DateRangePickerProps) {
  const handleSelect = (range: DayPickerDateRange | undefined) => {
    if (range?.from && range?.to) {
      onChange({ from: range.from, to: range.to });
    } else {
      onChange(undefined);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium leading-none">{label}</label>}
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            disabled={disabled}
            className={cn(
              'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
              !value && 'text-muted-foreground',
              error && 'border-destructive',
            )}
          >
            {value ? `${format(value.from, 'PP')} - ${format(value.to, 'PP')}` : placeholder}
            <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
          </button>
        </Popover.Trigger>
        <Popover.Content
          className="z-50 w-auto rounded-md border bg-background p-0 shadow-md"
          align="start"
        >
          <DayPicker
            mode="range"
            selected={value}
            onSelect={handleSelect}
            numberOfMonths={2}
            className="p-3"
          />
        </Popover.Content>
      </Popover.Root>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
