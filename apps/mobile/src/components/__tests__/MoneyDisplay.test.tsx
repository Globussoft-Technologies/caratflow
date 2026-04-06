import { describe, it, expect } from 'vitest';
import React from 'react';
import { MoneyDisplay } from '../MoneyDisplay';

function typeNameOf(node: any): string {
  if (!node) return '';
  if (typeof node.type === 'string') return node.type;
  return node.type?.displayName ?? node.type?.name ?? '';
}

describe('MoneyDisplay', () => {
  it('formats INR amount', () => {
    const result = MoneyDisplay({ amountPaise: 500_000 }) as any;
    expect(typeNameOf(result)).toBe('Text');
    const text = result.props.children;
    expect(text).toContain('5,000');
  });

  it('formats USD amount', () => {
    const result = MoneyDisplay({
      amountPaise: 199_99,
      currencyCode: 'USD',
    }) as any;
    const text = result.props.children;
    expect(text).toContain('$');
    expect(text).toContain('199.99');
  });

  it('handles zero amount', () => {
    const result = MoneyDisplay({ amountPaise: 0 }) as any;
    const text = result.props.children;
    expect(text).toContain('0');
  });

  it('handles large amounts with short format', () => {
    const result = MoneyDisplay({
      amountPaise: 1_000_000_000,
      short: true,
    }) as any;
    const text = result.props.children;
    expect(text).toMatch(/Cr/);
  });
});
