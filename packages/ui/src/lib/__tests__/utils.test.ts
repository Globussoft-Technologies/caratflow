import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn utility', () => {
  it('merges multiple class names into a single string', () => {
    const result = cn('text-sm', 'font-bold');
    expect(result).toBe('text-sm font-bold');
  });

  it('handles conditional class names', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn('base', isActive && 'active', isDisabled && 'disabled');
    expect(result).toContain('base');
    expect(result).toContain('active');
    expect(result).not.toContain('disabled');
  });

  it('handles undefined and null values', () => {
    const result = cn('base', undefined, null, 'extra');
    expect(result).toBe('base extra');
  });

  it('merges conflicting Tailwind classes correctly (last wins)', () => {
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4');
  });

  it('handles empty arguments', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles array-style class values', () => {
    const result = cn(['text-sm', 'font-bold']);
    expect(result).toBe('text-sm font-bold');
  });
});
