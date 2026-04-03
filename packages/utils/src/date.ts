// ─── CaratFlow Date Utilities ──────────────────────────────────
// Timezone-aware date helpers, financial year helpers, relative formatting.

// ─── Financial Year ────────────────────────────────────────────

export interface FinancialYear {
  label: string; // e.g., "FY 2025-26"
  startDate: Date;
  endDate: Date;
  startMonth: number; // 1-12
}

/** Get financial year config by country */
function fyStartMonth(countryCode: string): number {
  switch (countryCode.toUpperCase()) {
    case 'IN':
      return 4; // April
    case 'AU':
      return 7; // July
    case 'GB':
      return 4; // April
    default:
      return 1; // January (US and most countries)
  }
}

/** Get financial year for a given date and country */
export function getFinancialYear(date: Date, countryCode: string): FinancialYear {
  const startMonth = fyStartMonth(countryCode);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed

  let fyStartYear: number;
  if (month >= startMonth) {
    fyStartYear = year;
  } else {
    fyStartYear = year - 1;
  }

  const startDate = new Date(fyStartYear, startMonth - 1, 1);
  const endDate = new Date(fyStartYear + 1, startMonth - 1, 0, 23, 59, 59, 999); // Last day of prev month next year

  const fyEndYear = fyStartYear + 1;
  const label =
    startMonth === 1
      ? `FY ${fyStartYear}`
      : `FY ${fyStartYear}-${String(fyEndYear).slice(2)}`;

  return { label, startDate, endDate, startMonth };
}

/** Get financial year quarters */
export function getFinancialQuarters(
  date: Date,
  countryCode: string,
): Array<{ quarter: number; label: string; startDate: Date; endDate: Date }> {
  const fy = getFinancialYear(date, countryCode);
  const quarters = [];

  for (let q = 0; q < 4; q++) {
    const qStartMonth = ((fy.startMonth - 1 + q * 3) % 12);
    const qStartYear = fy.startDate.getFullYear() + (fy.startMonth - 1 + q * 3 >= 12 ? 1 : 0);
    const qStart = new Date(qStartYear, qStartMonth, 1);

    const qEndMonth = ((fy.startMonth - 1 + (q + 1) * 3) % 12);
    const qEndYear = fy.startDate.getFullYear() + (fy.startMonth - 1 + (q + 1) * 3 >= 12 ? 1 : 0);
    const qEnd = new Date(qEndYear, qEndMonth, 0, 23, 59, 59, 999);

    quarters.push({
      quarter: q + 1,
      label: `Q${q + 1}`,
      startDate: qStart,
      endDate: qEnd,
    });
  }

  return quarters;
}

// ─── Timezone Helpers ──────────────────────────────────────────

/** Format a date in a specific timezone */
export function formatInTimezone(
  date: Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const defaults: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  };
  return new Intl.DateTimeFormat('en-IN', { ...defaults, ...options }).format(date);
}

/** Get current date/time in a specific timezone */
export function nowInTimezone(timezone: string): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '0';
  return new Date(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second')),
  );
}

/** Get start of day in a timezone */
export function startOfDayInTimezone(date: Date, timezone: string): Date {
  const formatted = formatInTimezone(date, timezone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return new Date(formatted + 'T00:00:00');
}

// ─── Relative Date Formatting ──────────────────────────────────

export function relativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 0) return 'just now';
  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
}

// ─── Date Range Helpers ────────────────────────────────────────

export function isDateInRange(date: Date, from: Date, to: Date): boolean {
  return date >= from && date <= to;
}

export function daysInRange(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/** Get common date ranges relative to today */
export function getCommonDateRanges(today: Date = new Date()): Record<string, { from: Date; to: Date }> {
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  return {
    today: { from: startOfToday, to: endOfToday },
    yesterday: {
      from: new Date(startOfToday.getTime() - 86400000),
      to: new Date(endOfToday.getTime() - 86400000),
    },
    last7Days: {
      from: new Date(startOfToday.getTime() - 7 * 86400000),
      to: endOfToday,
    },
    last30Days: {
      from: new Date(startOfToday.getTime() - 30 * 86400000),
      to: endOfToday,
    },
    thisMonth: {
      from: new Date(today.getFullYear(), today.getMonth(), 1),
      to: endOfToday,
    },
    lastMonth: {
      from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      to: new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999),
    },
    thisYear: {
      from: new Date(today.getFullYear(), 0, 1),
      to: endOfToday,
    },
  };
}
