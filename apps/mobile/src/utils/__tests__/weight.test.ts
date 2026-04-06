import { describe, it, expect } from 'vitest';
import { formatWeight, convertWeight, mgToUnit } from '../weight';

describe('formatWeight', () => {
  it('formats milligrams to grams', () => {
    expect(formatWeight(11_664, 'g')).toBe('11.664 g');
  });

  it('formats milligrams to carats', () => {
    // 200 mg = 1 ct
    expect(formatWeight(200, 'ct')).toBe('1.000 ct');
  });

  it('formats milligrams to tola', () => {
    // 11,664 mg = 1 tola
    expect(formatWeight(11_664, 'tola')).toBe('1.000 tola');
  });

  it('formats milligrams to kg', () => {
    expect(formatWeight(1_000_000, 'kg')).toBe('1.000 kg');
  });

  it('formats with custom decimal places', () => {
    expect(formatWeight(11_664, 'g', 2)).toBe('11.66 g');
  });

  it('formats zero milligrams', () => {
    expect(formatWeight(0, 'g')).toBe('0.000 g');
  });

  it('formats troy ounces', () => {
    // 31103.4768 mg = 1 troy oz
    const result = formatWeight(31_103, 'troy_oz');
    expect(result).toContain('troy oz');
    expect(parseFloat(result)).toBeCloseTo(1.0, 0);
  });
});

describe('convertWeight', () => {
  it('converts grams to tola', () => {
    // 11.664 g = 1 tola
    const result = convertWeight(11.664, 'g', 'tola');
    expect(result).toBeCloseTo(1.0, 2);
  });

  it('converts carats to grams', () => {
    // 1 ct = 0.2 g
    const result = convertWeight(1, 'ct', 'g');
    expect(result).toBeCloseTo(0.2, 3);
  });

  it('converts grams to milligrams', () => {
    expect(convertWeight(5, 'g', 'mg')).toBe(5_000);
  });

  it('converts same unit to same value', () => {
    expect(convertWeight(100, 'g', 'g')).toBe(100);
  });

  it('converts kg to grams', () => {
    expect(convertWeight(1, 'kg', 'g')).toBe(1_000);
  });
});

describe('mgToUnit', () => {
  it('converts mg to grams', () => {
    expect(mgToUnit(5_000, 'g')).toBe(5);
  });

  it('converts mg to carats', () => {
    expect(mgToUnit(1_000, 'ct')).toBe(5);
  });

  it('converts mg to tola', () => {
    const result = mgToUnit(11_664, 'tola');
    expect(result).toBeCloseTo(1.0, 2);
  });
});
