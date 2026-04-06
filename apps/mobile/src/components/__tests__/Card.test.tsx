import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Card } from '../Card';

function typeNameOf(node: any): string {
  if (!node) return '';
  if (typeof node.type === 'string') return node.type;
  return node.type?.displayName ?? node.type?.name ?? '';
}

describe('Card', () => {
  it('renders children inside a View when no onPress', () => {
    const result = Card({ children: 'Card Content' }) as any;
    expect(typeNameOf(result)).toBe('View');
    expect(result.props.children).toBe('Card Content');
  });

  it('renders as Pressable when onPress is provided', () => {
    const handler = vi.fn();
    const result = Card({ children: 'Tap me', onPress: handler }) as any;
    expect(typeNameOf(result)).toBe('Pressable');
    expect(result.props.onPress).toBe(handler);
    expect(result.props.children).toBe('Tap me');
  });

  it('applies custom style prop', () => {
    const customStyle = { marginTop: 10 };
    const result = Card({ children: 'Styled', style: customStyle }) as any;
    expect(result.props.style).toEqual(customStyle);
  });

  it('applies custom className', () => {
    const result = Card({ children: 'X', className: 'mt-4' }) as any;
    expect(result.props.className).toContain('mt-4');
    expect(result.props.className).toContain('bg-white');
  });
});
