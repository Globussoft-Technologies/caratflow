import { describe, it, expect } from 'vitest';
import {
  getFinancialYear,
  getFinancialQuarters,
  relativeTime,
  isDateInRange,
  daysInRange,
  getCommonDateRanges,
  formatInTimezone,
  nowInTimezone,
} from '../date';

describe('getFinancialYear', () => {
  // ─── Indian Financial Year (April - March) ────────────────────

  describe('Indian FY (starts April)', () => {
    it('January 2026 falls in FY 2025-26', () => {
      const date = new Date(2026, 0, 15);
      const fy = getFinancialYear(date, 'IN');
      expect(fy.label).toBe('FY 2025-26');
      expect(fy.startMonth).toBe(4);
      expect(fy.startDate.getFullYear()).toBe(2025);
      expect(fy.startDate.getMonth()).toBe(3);
    });

    it('April 1, 2026 falls in FY 2026-27', () => {
      const date = new Date(2026, 3, 1);
      const fy = getFinancialYear(date, 'IN');
      expect(fy.label).toBe('FY 2026-27');
      expect(fy.startDate.getFullYear()).toBe(2026);
      expect(fy.startDate.getMonth()).toBe(3);
    });

    it('March 31, 2026 falls in FY 2025-26', () => {
      const date = new Date(2026, 2, 31);
      const fy = getFinancialYear(date, 'IN');
      expect(fy.label).toBe('FY 2025-26');
    });

    it('FY end date is March 31 of next year', () => {
      const date = new Date(2026, 5, 15);
      const fy = getFinancialYear(date, 'IN');
      expect(fy.endDate.getMonth()).toBe(2); // March
      expect(fy.endDate.getDate()).toBe(31);
      expect(fy.endDate.getFullYear()).toBe(2027);
    });

    it('February 28, 2026 falls in FY 2025-26', () => {
      const date = new Date(2026, 1, 28);
      const fy = getFinancialYear(date, 'IN');
      expect(fy.label).toBe('FY 2025-26');
    });

    it('December 31, 2025 falls in FY 2025-26', () => {
      const date = new Date(2025, 11, 31);
      const fy = getFinancialYear(date, 'IN');
      expect(fy.label).toBe('FY 2025-26');
    });

    it('April 1, 2025 falls in FY 2025-26', () => {
      const date = new Date(2025, 3, 1);
      const fy = getFinancialYear(date, 'IN');
      expect(fy.label).toBe('FY 2025-26');
    });

    it('FY start date is April 1', () => {
      const date = new Date(2026, 5, 15);
      const fy = getFinancialYear(date, 'IN');
      expect(fy.startDate.getMonth()).toBe(3);
      expect(fy.startDate.getDate()).toBe(1);
    });
  });

  // ─── US Financial Year (January - December) ───────────────────

  describe('US FY (starts January)', () => {
    it('any date in 2026 falls in FY 2026', () => {
      const date = new Date(2026, 5, 15);
      const fy = getFinancialYear(date, 'US');
      expect(fy.label).toBe('FY 2026');
      expect(fy.startMonth).toBe(1);
    });

    it('January 1, 2026 is FY 2026', () => {
      const date = new Date(2026, 0, 1);
      const fy = getFinancialYear(date, 'US');
      expect(fy.label).toBe('FY 2026');
    });

    it('December 31, 2026 is FY 2026', () => {
      const date = new Date(2026, 11, 31);
      const fy = getFinancialYear(date, 'US');
      expect(fy.label).toBe('FY 2026');
    });

    it('FY start date is January 1', () => {
      const date = new Date(2026, 5, 15);
      const fy = getFinancialYear(date, 'US');
      expect(fy.startDate.getMonth()).toBe(0);
      expect(fy.startDate.getDate()).toBe(1);
    });

    it('FY end date is December 31', () => {
      const date = new Date(2026, 5, 15);
      const fy = getFinancialYear(date, 'US');
      expect(fy.endDate.getMonth()).toBe(11);
      expect(fy.endDate.getDate()).toBe(31);
    });
  });

  // ─── UK Financial Year (April - March, same as India) ─────────

  describe('UK FY (starts April)', () => {
    it('February 2026 falls in FY 2025-26', () => {
      const date = new Date(2026, 1, 15);
      const fy = getFinancialYear(date, 'GB');
      expect(fy.label).toBe('FY 2025-26');
    });

    it('April 2026 falls in FY 2026-27', () => {
      const date = new Date(2026, 3, 15);
      const fy = getFinancialYear(date, 'GB');
      expect(fy.label).toBe('FY 2026-27');
    });
  });

  // ─── Australian Financial Year (July - June) ──────────────────

  describe('Australian FY (starts July)', () => {
    it('August 2026 falls in FY 2026-27', () => {
      const date = new Date(2026, 7, 15);
      const fy = getFinancialYear(date, 'AU');
      expect(fy.label).toBe('FY 2026-27');
      expect(fy.startMonth).toBe(7);
    });

    it('June 2026 falls in FY 2025-26', () => {
      const date = new Date(2026, 5, 15);
      const fy = getFinancialYear(date, 'AU');
      expect(fy.label).toBe('FY 2025-26');
    });

    it('July 1, 2026 falls in FY 2026-27', () => {
      const date = new Date(2026, 6, 1);
      const fy = getFinancialYear(date, 'AU');
      expect(fy.label).toBe('FY 2026-27');
    });

    it('June 30, 2026 falls in FY 2025-26', () => {
      const date = new Date(2026, 5, 30);
      const fy = getFinancialYear(date, 'AU');
      expect(fy.label).toBe('FY 2025-26');
    });
  });

  // ─── Year Boundary Edge Cases ─────────────────────────────────

  describe('year boundary edge cases', () => {
    it('leap year Feb 29 in Indian FY', () => {
      // 2028 is a leap year
      const date = new Date(2028, 1, 29);
      const fy = getFinancialYear(date, 'IN');
      expect(fy.label).toBe('FY 2027-28');
    });

    it('December 31 just before new year in Indian FY', () => {
      const date = new Date(2026, 11, 31);
      const fy = getFinancialYear(date, 'IN');
      expect(fy.label).toBe('FY 2026-27');
    });

    it('January 1 at start of new year in Indian FY', () => {
      const date = new Date(2027, 0, 1);
      const fy = getFinancialYear(date, 'IN');
      expect(fy.label).toBe('FY 2026-27');
    });
  });
});

describe('getFinancialQuarters', () => {
  it('returns 4 quarters for Indian FY', () => {
    const date = new Date(2026, 5, 15);
    const quarters = getFinancialQuarters(date, 'IN');
    expect(quarters).toHaveLength(4);
    expect(quarters[0]!.quarter).toBe(1);
    expect(quarters[0]!.label).toBe('Q1');
    expect(quarters[3]!.quarter).toBe(4);
    expect(quarters[3]!.label).toBe('Q4');
  });

  it('Q1 starts in April for Indian FY', () => {
    const date = new Date(2026, 5, 15);
    const quarters = getFinancialQuarters(date, 'IN');
    expect(quarters[0]!.startDate.getMonth()).toBe(3); // April
  });

  it('Q2 starts in July for Indian FY', () => {
    const date = new Date(2026, 5, 15);
    const quarters = getFinancialQuarters(date, 'IN');
    expect(quarters[1]!.startDate.getMonth()).toBe(6); // July
  });

  it('Q3 starts in October for Indian FY', () => {
    const date = new Date(2026, 5, 15);
    const quarters = getFinancialQuarters(date, 'IN');
    expect(quarters[2]!.startDate.getMonth()).toBe(9); // October
  });

  it('Q4 starts in January for Indian FY', () => {
    const date = new Date(2026, 5, 15);
    const quarters = getFinancialQuarters(date, 'IN');
    expect(quarters[3]!.startDate.getMonth()).toBe(0); // January
    expect(quarters[3]!.startDate.getFullYear()).toBe(2027); // Next year
  });

  it('returns 4 quarters for US FY', () => {
    const date = new Date(2026, 5, 15);
    const quarters = getFinancialQuarters(date, 'US');
    expect(quarters).toHaveLength(4);
  });

  it('Q1 starts in January for US FY', () => {
    const date = new Date(2026, 5, 15);
    const quarters = getFinancialQuarters(date, 'US');
    expect(quarters[0]!.startDate.getMonth()).toBe(0); // January
  });

  it('each quarter has a label', () => {
    const quarters = getFinancialQuarters(new Date(2026, 5, 15), 'IN');
    expect(quarters.map((q) => q.label)).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  });

  it('quarters cover the full FY (no gaps)', () => {
    const date = new Date(2026, 5, 15);
    const quarters = getFinancialQuarters(date, 'IN');
    // Q1 end should be day before Q2 start (approximately)
    for (let i = 0; i < 3; i++) {
      const qEnd = quarters[i]!.endDate;
      const nextQStart = quarters[i + 1]!.startDate;
      // End of quarter should be the day before start of next quarter
      const dayAfterEnd = new Date(qEnd.getTime() + 1);
      expect(dayAfterEnd.getDate()).toBe(nextQStart.getDate());
    }
  });
});

describe('relativeTime', () => {
  const now = new Date(2026, 3, 4, 12, 0, 0);

  it('returns "just now" for times within 60 seconds', () => {
    const date = new Date(2026, 3, 4, 11, 59, 30);
    expect(relativeTime(date, now)).toBe('just now');
  });

  it('returns "just now" for 0 seconds ago', () => {
    expect(relativeTime(now, now)).toBe('just now');
  });

  it('returns minutes ago', () => {
    const date = new Date(2026, 3, 4, 11, 45, 0);
    expect(relativeTime(date, now)).toBe('15m ago');
  });

  it('returns 1m ago for 1 minute', () => {
    const date = new Date(2026, 3, 4, 11, 59, 0);
    expect(relativeTime(date, now)).toBe('1m ago');
  });

  it('returns 59m ago for 59 minutes', () => {
    const date = new Date(2026, 3, 4, 11, 1, 0);
    expect(relativeTime(date, now)).toBe('59m ago');
  });

  it('returns hours ago', () => {
    const date = new Date(2026, 3, 4, 9, 0, 0);
    expect(relativeTime(date, now)).toBe('3h ago');
  });

  it('returns 1h ago for 1 hour', () => {
    const date = new Date(2026, 3, 4, 11, 0, 0);
    expect(relativeTime(date, now)).toBe('1h ago');
  });

  it('returns days ago', () => {
    const date = new Date(2026, 3, 1, 12, 0, 0);
    expect(relativeTime(date, now)).toBe('3d ago');
  });

  it('returns 1d ago for 1 day', () => {
    const date = new Date(2026, 3, 3, 12, 0, 0);
    expect(relativeTime(date, now)).toBe('1d ago');
  });

  it('returns weeks ago', () => {
    const refNow = new Date(2026, 3, 28, 12, 0, 0);
    const date = new Date(2026, 3, 7, 12, 0, 0);
    expect(relativeTime(date, refNow)).toBe('3w ago');
  });

  it('returns 1w ago for 7-13 days', () => {
    const date = new Date(2026, 2, 27, 12, 0, 0);
    expect(relativeTime(date, now)).toBe('1w ago');
  });

  it('returns months ago', () => {
    const refNow = new Date(2026, 6, 15, 12, 0, 0);
    const date = new Date(2026, 3, 15, 12, 0, 0);
    expect(relativeTime(date, refNow)).toBe('3mo ago');
  });

  it('returns years ago', () => {
    const refNow = new Date(2028, 3, 4, 12, 0, 0);
    const date = new Date(2026, 3, 4, 12, 0, 0);
    expect(relativeTime(date, refNow)).toBe('2y ago');
  });

  it('returns "just now" for future dates', () => {
    const future = new Date(2026, 3, 5, 12, 0, 0);
    expect(relativeTime(future, now)).toBe('just now');
  });

  it('uses current time when now parameter is omitted', () => {
    const recent = new Date(Date.now() - 30000); // 30 seconds ago
    expect(relativeTime(recent)).toBe('just now');
  });
});

describe('isDateInRange', () => {
  it('returns true when date is within range', () => {
    const date = new Date(2026, 3, 15);
    const from = new Date(2026, 3, 1);
    const to = new Date(2026, 3, 30);
    expect(isDateInRange(date, from, to)).toBe(true);
  });

  it('returns true when date equals from boundary', () => {
    const date = new Date(2026, 3, 1);
    expect(isDateInRange(date, date, new Date(2026, 3, 30))).toBe(true);
  });

  it('returns true when date equals to boundary', () => {
    const date = new Date(2026, 3, 30);
    expect(isDateInRange(date, new Date(2026, 3, 1), date)).toBe(true);
  });

  it('returns false when date is before range', () => {
    const date = new Date(2026, 2, 15);
    const from = new Date(2026, 3, 1);
    const to = new Date(2026, 3, 30);
    expect(isDateInRange(date, from, to)).toBe(false);
  });

  it('returns false when date is after range', () => {
    const date = new Date(2026, 4, 15);
    const from = new Date(2026, 3, 1);
    const to = new Date(2026, 3, 30);
    expect(isDateInRange(date, from, to)).toBe(false);
  });

  it('returns true for single-day range', () => {
    const date = new Date(2026, 3, 15);
    expect(isDateInRange(date, date, date)).toBe(true);
  });
});

describe('daysInRange', () => {
  it('calculates days between two dates', () => {
    const from = new Date(2026, 3, 1);
    const to = new Date(2026, 3, 10);
    expect(daysInRange(from, to)).toBe(9);
  });

  it('returns 0 for same date', () => {
    const date = new Date(2026, 3, 1);
    expect(daysInRange(date, date)).toBe(0);
  });

  it('returns 1 for consecutive days', () => {
    const from = new Date(2026, 3, 1);
    const to = new Date(2026, 3, 2);
    expect(daysInRange(from, to)).toBe(1);
  });

  it('handles month boundary', () => {
    const from = new Date(2026, 2, 30);
    const to = new Date(2026, 3, 2);
    expect(daysInRange(from, to)).toBe(3);
  });

  it('handles year boundary', () => {
    const from = new Date(2025, 11, 31);
    const to = new Date(2026, 0, 1);
    expect(daysInRange(from, to)).toBe(1);
  });

  it('handles leap year February', () => {
    // 2028 is a leap year
    const from = new Date(2028, 1, 1);
    const to = new Date(2028, 2, 1); // March 1
    expect(daysInRange(from, to)).toBe(29);
  });

  it('handles non-leap year February', () => {
    const from = new Date(2026, 1, 1);
    const to = new Date(2026, 2, 1); // March 1
    expect(daysInRange(from, to)).toBe(28);
  });

  it('calculates full year', () => {
    const from = new Date(2026, 0, 1);
    const to = new Date(2027, 0, 1);
    expect(daysInRange(from, to)).toBe(365);
  });
});

describe('getCommonDateRanges', () => {
  const today = new Date(2026, 3, 15, 10, 30, 0); // April 15, 2026

  it('returns expected range keys', () => {
    const ranges = getCommonDateRanges(today);
    expect(Object.keys(ranges)).toEqual(
      expect.arrayContaining([
        'today',
        'yesterday',
        'last7Days',
        'last30Days',
        'thisMonth',
        'lastMonth',
        'thisYear',
      ]),
    );
  });

  it('today range starts and ends on same date', () => {
    const ranges = getCommonDateRanges(today);
    expect(ranges.today!.from.getDate()).toBe(15);
    expect(ranges.today!.to.getDate()).toBe(15);
    expect(ranges.today!.from.getMonth()).toBe(3);
    expect(ranges.today!.to.getMonth()).toBe(3);
  });

  it('today starts at 00:00:00 and ends at 23:59:59', () => {
    const ranges = getCommonDateRanges(today);
    expect(ranges.today!.from.getHours()).toBe(0);
    expect(ranges.today!.from.getMinutes()).toBe(0);
    expect(ranges.today!.to.getHours()).toBe(23);
    expect(ranges.today!.to.getMinutes()).toBe(59);
    expect(ranges.today!.to.getSeconds()).toBe(59);
  });

  it('yesterday range is the previous day', () => {
    const ranges = getCommonDateRanges(today);
    expect(ranges.yesterday!.from.getDate()).toBe(14);
    expect(ranges.yesterday!.to.getDate()).toBe(14);
  });

  it('thisMonth starts on the 1st', () => {
    const ranges = getCommonDateRanges(today);
    expect(ranges.thisMonth!.from.getDate()).toBe(1);
    expect(ranges.thisMonth!.from.getMonth()).toBe(3);
  });

  it('lastMonth covers the full previous month', () => {
    const ranges = getCommonDateRanges(today);
    expect(ranges.lastMonth!.from.getDate()).toBe(1);
    expect(ranges.lastMonth!.from.getMonth()).toBe(2); // March
    expect(ranges.lastMonth!.to.getDate()).toBe(31); // March has 31 days
    expect(ranges.lastMonth!.to.getMonth()).toBe(2);
  });

  it('thisYear starts on January 1', () => {
    const ranges = getCommonDateRanges(today);
    expect(ranges.thisYear!.from.getMonth()).toBe(0);
    expect(ranges.thisYear!.from.getDate()).toBe(1);
    expect(ranges.thisYear!.from.getFullYear()).toBe(2026);
  });

  it('last7Days covers 7 days before today', () => {
    const ranges = getCommonDateRanges(today);
    expect(ranges.last7Days!.from.getDate()).toBe(8); // April 15 - 7 = April 8
  });

  it('last30Days starts 30 days before today', () => {
    const ranges = getCommonDateRanges(today);
    // from is 30 days before start of today, to is end of today
    const fromExpected = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);
    expect(ranges.last30Days!.from.getDate()).toBe(fromExpected.getDate());
    expect(ranges.last30Days!.from.getMonth()).toBe(fromExpected.getMonth());
  });

  it('uses current date when no argument provided', () => {
    const ranges = getCommonDateRanges();
    expect(ranges.today).toBeDefined();
    expect(ranges.today!.from.getDate()).toBe(new Date().getDate());
  });
});

describe('formatInTimezone', () => {
  it('formats a date in IST timezone', () => {
    const date = new Date('2026-04-15T00:00:00Z');
    const formatted = formatInTimezone(date, 'Asia/Kolkata');
    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
    // IST is UTC+5:30, so midnight UTC is 5:30 AM IST
    expect(formatted).toContain('15');
  });

  it('formats a date in US Eastern timezone', () => {
    const date = new Date('2026-04-15T12:00:00Z');
    const formatted = formatInTimezone(date, 'America/New_York');
    expect(formatted).toBeDefined();
  });

  it('respects custom format options', () => {
    const date = new Date('2026-04-15T12:00:00Z');
    const formatted = formatInTimezone(date, 'Asia/Kolkata', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
    expect(formatted).toContain('2026');
  });
});

describe('nowInTimezone', () => {
  it('returns a Date object', () => {
    const result = nowInTimezone('Asia/Kolkata');
    expect(result).toBeInstanceOf(Date);
  });

  it('returns a valid date (not NaN)', () => {
    const result = nowInTimezone('America/New_York');
    expect(result.getTime()).not.toBeNaN();
  });
});
