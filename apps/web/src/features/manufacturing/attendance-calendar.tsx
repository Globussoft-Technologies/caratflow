'use client';

import * as React from 'react';
import { cn } from '@caratflow/ui';

interface AttendanceDay {
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';
  overtimeMinutes?: number;
}

interface AttendanceCalendarProps {
  month: number; // 0-11
  year: number;
  records: AttendanceDay[];
  onDayClick?: (date: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  ABSENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  HALF_DAY: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  LEAVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function AttendanceCalendar({ month, year, records, onDayClick }: AttendanceCalendarProps) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const recordMap = new Map(
    records.map((r) => [r.date.slice(0, 10), r]),
  );

  const cells: React.ReactNode[] = [];

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="h-10" />);
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = recordMap.get(dateStr);

    cells.push(
      <div
        key={day}
        className={cn(
          'flex h-10 items-center justify-center rounded text-sm font-medium cursor-pointer transition-colors',
          record
            ? STATUS_COLORS[record.status]
            : 'text-muted-foreground hover:bg-muted',
        )}
        onClick={() => onDayClick?.(dateStr)}
        title={record ? `${record.status}${record.overtimeMinutes ? ` (+${record.overtimeMinutes}m OT)` : ''}` : dateStr}
      >
        {day}
      </div>,
    );
  }

  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">
        {monthName} {year}
      </h3>
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((name) => (
          <div key={name} className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground">
            {name}
          </div>
        ))}
        {cells}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-emerald-200" /> Present
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-red-200" /> Absent
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-amber-200" /> Half Day
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-blue-200" /> Leave
        </span>
      </div>
    </div>
  );
}
