import { describe, it, expect } from 'vitest';
import {
  getFinancialYear,
  getFinancialQuarters,
  relativeTime,
  isDateInRange,
  daysInRange,
  getCommonDateRanges,
} from '../date';

describe('getFinancialYear', () => {
  // ─── Indian Financial Year (April - March) ────────────────────

  describe('Indian FY (starts April)', () => {
    it('January 2026 falls in FY 2025-26', () => {
      const date = new Date(2026, 0, 15); // Jan 15, 2026
      const fy = getFinancialYear(date, 'IN');
      expect(fy.label).toBe('FY 2025-26');
      expect(fy.startMonth).toBe(4);
      expect(fy.startDate.getFullYear()).toBe(2025);
      expect(fy.startDate.getMonth()).toBe(3); // April (0-indexed)
    });

    it('April 1, 2026 falls in FY 2026-27', () => {
      const date = new Date(2026, 3, 1); // Apr 1, 2026
      const fy = getFinancialYear(date, 'IN');
      expect(fy.label).toBe('FY 2026-27');
      expect(fy.startDate.getFullYear()).toBe(2026);
      expect(fy.startDate.getMonth()).toBe(3);
    });

    it('March 31, 2026 falls in FY 2025-26', () => {
      const date = new Date(2026, 2, 31); // Mar 31, 2026
      const fy = getFinancialYear(date, 'IN');
      expect(fy.label).toBe('FY 2025-26');
    });

    it('FY end date is March 31 of next year', () => {
      const date = new Date(2026, 5, 15); // Jun 15, 2026
      const fy = getFinancialYear(date, 'IN');
      expect(fy.endDate.getMonth()).toBe(2); // March
      expect(fy.endDate.getDate()).toBe(31);
      expect(fy.endDate.getFullYear()).toBe(2027);
    });
  });

  // ─── US Financial Year (January - December) ───────────────────

  describe('US FY (starts January)', () => {
    it('any date in 2026 falls in FY 2026', () => {
      const date = new Date(2026, 5, 15); // Jun 15, 2026
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
  });

  // ─── UK Financial Year (April - March, same as India) ─────────

  describe('UK FY (starts April)', () => {
    it('February 2026 falls in FY 2025-26', () => {
      const date = new Date(2026, 1, 15);
      const fy = getFinancialYear(date, 'GB');
      expect(fy.label).toBe('FY 2025-26');
    });
  });

  // ─── Australian Financial Year (July - June) ──────────────────

  describe('Australian FY (starts July)', () => {
    it('August 2026 falls in FY 2026-27', () => {
      const date = new Date(2026, 7, 15); // Aug
      const fy = getFinancialYear(date, 'AU');
      expect(fy.label).toBe('FY 2026-27');
      expect(fy.startMonth).toBe(7);
    });

    it('June 2026 falls in FY 2025-26', () => {
      const date = new Date(2026, 5, 15); // Jun
      const fy = getFinancialYear(date, 'AU');
      expect(fy.label).toBe('FY 2025-26');
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
  });

  it('Q1 starts in April for Indian FY', () => {
    const date = new Date(2026, 5, 15);
    const quarters = getFinancialQuarters(date, 'IN');
    expect(quarters[0]!.startDate.getMonth()).toBe(3); // April
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
});

describe('relativeTime', () => {
  it('returns "just now" for times within 60 seconds', () => {
    const now = new Date(2026, 3, 4, 12, 0, 0);
    const date = new Date(2026, 3, 4, 11, 59, 30);
    expect(relativeTime(date, now)).toBe('just now');
  });

  it('returns minutes ago', () => {
    const now = new Date(2026, 3, 4, 12, 0, 0);
    const date = new Date(2026, 3, 4, 11, 45, 0);
    expect(relativeTime(date, now)).toBe('15m ago');
  });

  it('returns hours ago', () => {
    const now = new Date(2026, 3, 4, 12, 0, 0);
    const date = new Date(2026, 3, 4, 9, 0, 0);
    expect(relativeTime(date, now)).toBe('3h ago');
  });

  it('returns days ago', () => {
    const now = new Date(2026, 3, 4, 12, 0, 0);
    const date = new Date(2026, 3, 1, 12, 0, 0);
    expect(relativeTime(date, now)).toBe('3d ago');
  });

  it('returns weeks ago', () => {
    const now = new Date(2026, 3, 28, 12, 0, 0);
    const date = new Date(2026, 3, 7, 12, 0, 0);
    expect(relativeTime(date, now)).toBe('3w ago');
  });

  it('returns months ago', () => {
    const now = new Date(2026, 6, 15, 12, 0, 0);
    const date = new Date(2026, 3, 15, 12, 0, 0);
    expect(relativeTime(date, now)).toBe('3mo ago');
  });

  it('returns years ago', () => {
    const now = new Date(2028, 3, 4, 12, 0, 0);
    const date = new Date(2026, 3, 4, 12, 0, 0);
    expect(relativeTime(date, now)).toBe('2y ago');
  });

  it('returns "just now" for future dates', () => {
    const now = new Date(2026, 3, 4, 12, 0, 0);
    const future = new Date(2026, 3, 5, 12, 0, 0);
    expect(relativeTime(future, now)).toBe('just now');
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
});

describe('getCommonDateRanges', () => {
  it('returns expected range keys', () => {
    const ranges = getCommonDateRanges();
    expect(Object.keys(ranges)).toEqual(
      expect.arrayContaining(['today', 'yesterday', 'last7Days', 'last30Days', 'thisMonth', 'lastMonth', 'thisYear']),
    );
  });

  it('today range starts and ends on same date', () => {
    const today = new Date(2026, 3, 4, 10, 30, 0);
    const ranges = getCommonDateRanges(today);
    expect(ranges.today!.from.getDate()).toBe(4);
    expect(ranges.today!.to.getDate()).toBe(4);
  });

  it('yesterday range is the previous day', () => {
    const today = new Date(2026, 3, 4, 10, 30, 0);
    const ranges = getCommonDateRanges(today);
    expect(ranges.yesterday!.from.getDate()).toBe(3);
    expect(ranges.yesterday!.to.getDate()).toBe(3);
  });

  it('thisMonth starts on the 1st', () => {
    const today = new Date(2026, 3, 15, 10, 30, 0);
    const ranges = getCommonDateRanges(today);
    expect(ranges.thisMonth!.from.getDate()).toBe(1);
    expect(ranges.thisMonth!.from.getMonth()).toBe(3);
  });
});
