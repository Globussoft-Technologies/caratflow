import { describe, it, expect } from 'vitest';
import { finenessToKaratLabel, finenessToPercentage } from '../purity';

describe('finenessToKaratLabel', () => {
  it('returns 24K label for 999 fineness', () => {
    expect(finenessToKaratLabel(999)).toBe('24K (999)');
  });

  it('returns 22K label for 916 fineness', () => {
    expect(finenessToKaratLabel(916)).toBe('22K (916)');
  });

  it('returns 18K label for 750 fineness', () => {
    expect(finenessToKaratLabel(750)).toBe('18K (750)');
  });

  it('returns 14K label for 585 fineness', () => {
    expect(finenessToKaratLabel(585)).toBe('14K (585)');
  });

  it('returns generic label for unknown fineness', () => {
    expect(finenessToKaratLabel(333)).toBe('333 fineness');
  });

  it('returns generic label for arbitrary fineness', () => {
    expect(finenessToKaratLabel(875)).toBe('875 fineness');
  });
});

describe('finenessToPercentage', () => {
  it('converts 999 fineness to 99.9%', () => {
    expect(finenessToPercentage(999)).toBeCloseTo(99.9);
  });

  it('converts 916 fineness to 91.6%', () => {
    expect(finenessToPercentage(916)).toBeCloseTo(91.6);
  });

  it('converts 750 fineness to 75%', () => {
    expect(finenessToPercentage(750)).toBe(75);
  });

  it('converts 0 fineness to 0%', () => {
    expect(finenessToPercentage(0)).toBe(0);
  });
});
