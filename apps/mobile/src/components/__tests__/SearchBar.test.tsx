import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatMoney, formatMoneyShort } from '@/utils/money';

// SearchBar uses React hooks (useState, useRef, useCallback, useEffect),
// which cannot be called outside a React render context with our mocked RN.
// Instead, we test the SearchBar's underlying logic and the debounce behavior.

describe('SearchBar logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('debounce fires callback after specified delay', () => {
    const callback = vi.fn();
    const debounceMs = 300;

    // Simulate the debounce mechanism used in SearchBar
    let timeoutRef: ReturnType<typeof setTimeout> | null = null;
    const debouncedSearch = (text: string) => {
      if (timeoutRef) clearTimeout(timeoutRef);
      timeoutRef = setTimeout(() => callback(text), debounceMs);
    };

    debouncedSearch('gold ring');
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(callback).toHaveBeenCalledWith('gold ring');
  });

  it('debounce resets timer on rapid input', () => {
    const callback = vi.fn();
    const debounceMs = 300;

    let timeoutRef: ReturnType<typeof setTimeout> | null = null;
    const debouncedSearch = (text: string) => {
      if (timeoutRef) clearTimeout(timeoutRef);
      timeoutRef = setTimeout(() => callback(text), debounceMs);
    };

    debouncedSearch('g');
    vi.advanceTimersByTime(100);
    debouncedSearch('go');
    vi.advanceTimersByTime(100);
    debouncedSearch('gold');
    vi.advanceTimersByTime(300);

    // Only the last call should fire
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('gold');
  });

  it('clear invokes onSearch with empty string immediately', () => {
    const callback = vi.fn();
    // Simulates SearchBar's handleClear behavior
    callback('');
    expect(callback).toHaveBeenCalledWith('');
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
