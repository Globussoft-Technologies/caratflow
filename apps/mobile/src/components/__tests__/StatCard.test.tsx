import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { StatCard } from '../StatCard';

function typeNameOf(node: any): string {
  if (!node) return '';
  if (typeof node.type === 'string') return node.type;
  return node.type?.displayName ?? node.type?.name ?? '';
}

describe('StatCard', () => {
  it('renders the value text', () => {
    const result = StatCard({ title: 'Sales', value: '12,500' }) as any;
    expect(typeNameOf(result)).toBe('View');
    const serialized = JSON.stringify(result);
    expect(serialized).toContain('12,500');
  });

  it('renders the title label', () => {
    const result = StatCard({ title: 'Revenue', value: '50L' }) as any;
    const serialized = JSON.stringify(result);
    expect(serialized).toContain('Revenue');
  });

  it('renders trend indicator when trend is provided', () => {
    const result = StatCard({
      title: 'Sales',
      value: '100',
      trend: 12.5,
    }) as any;
    const serialized = JSON.stringify(result);
    // React splits template literal children: ["+", "12.5", "%"]
    expect(serialized).toContain('12.5');
    expect(serialized).toContain('text-green-600');
  });

  it('renders negative trend correctly', () => {
    const result = StatCard({
      title: 'Sales',
      value: '80',
      trend: -5.3,
    }) as any;
    const serialized = JSON.stringify(result);
    expect(serialized).toContain('-5.3');
    expect(serialized).toContain('text-red-600');
  });

  it('renders as Pressable when onPress is provided', () => {
    const handler = vi.fn();
    const result = StatCard({
      title: 'Sales',
      value: '100',
      onPress: handler,
    }) as any;
    expect(typeNameOf(result)).toBe('Pressable');
    expect(result.props.onPress).toBe(handler);
  });
});
