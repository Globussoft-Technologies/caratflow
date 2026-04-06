import { describe, it, expect, beforeEach } from 'vitest';
import { formatWeight } from '@/utils/weight';
import { useAppStore } from '@/store/app-store';

// WeightDisplay uses useAppStore hook which requires React render context.
// We test the underlying logic: formatWeight + store preference.

describe('WeightDisplay logic', () => {
  beforeEach(() => {
    useAppStore.setState({ weightUnit: 'g' });
  });

  it('formats weight in grams', () => {
    const unit = useAppStore.getState().weightUnit;
    const text = formatWeight(11_664, unit);
    expect(text).toContain('11.664');
    expect(text).toContain('g');
  });

  it('formats weight in carats when unit overrides store', () => {
    const text = formatWeight(200, 'ct');
    expect(text).toContain('1.000');
    expect(text).toContain('ct');
  });

  it('uses store weightUnit preference', () => {
    useAppStore.setState({ weightUnit: 'tola' });
    const unit = useAppStore.getState().weightUnit;
    const text = formatWeight(11_664, unit);
    expect(text).toContain('tola');
  });
});
