'use client';

import * as React from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  from: Date;
  to: Date;
  onChange: (from: Date, to: Date) => void;
  presets?: boolean;
}

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'This Month', days: -1 }, // Special handling
  { label: 'Last Month', days: -2 }, // Special handling
  { label: 'This Quarter', days: -3 },
] as const;

export function DateRangePicker({
  from,
  to,
  onChange,
  presets = true,
}: DateRangePickerProps) {
  const [showPresets, setShowPresets] = React.useState(false);

  const handlePreset = (preset: (typeof PRESETS)[number]) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (preset.days) {
      case 0:
        onChange(todayStart, todayEnd);
        break;
      case -1: // This month
        onChange(
          new Date(now.getFullYear(), now.getMonth(), 1),
          todayEnd,
        );
        break;
      case -2: // Last month
        onChange(
          new Date(now.getFullYear(), now.getMonth() - 1, 1),
          new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
        );
        break;
      case -3: { // This quarter
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        onChange(
          new Date(now.getFullYear(), qMonth, 1),
          todayEnd,
        );
        break;
      }
      default:
        onChange(
          new Date(todayStart.getTime() - preset.days * 86400000),
          todayEnd,
        );
    }

    setShowPresets(false);
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="relative inline-flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <input
          type="date"
          value={from.toISOString().split('T')[0]}
          onChange={(e) => onChange(new Date(e.target.value), to)}
          className="bg-transparent border-none outline-none w-32"
        />
        <span className="text-muted-foreground">to</span>
        <input
          type="date"
          value={to.toISOString().split('T')[0]}
          onChange={(e) => onChange(from, new Date(e.target.value))}
          className="bg-transparent border-none outline-none w-32"
        />
      </div>

      {presets && (
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="px-3 py-2 text-sm border rounded-md hover:bg-accent"
          >
            Presets
          </button>
          {showPresets && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-md py-1 min-w-[140px]">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset)}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
