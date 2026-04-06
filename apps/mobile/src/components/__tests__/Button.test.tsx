import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Button } from '../Button';

function typeNameOf(node: any): string {
  if (!node) return '';
  if (typeof node.type === 'string') return node.type;
  return node.type?.displayName ?? node.type?.name ?? '';
}

describe('Button', () => {
  it('renders primary variant by default', () => {
    const result = Button({ title: 'Submit', onPress: vi.fn() }) as any;
    expect(typeNameOf(result)).toBe('Pressable');
    expect(result.props.className).toContain('bg-primary-400');
  });

  it('renders secondary variant', () => {
    const result = Button({
      title: 'Cancel',
      onPress: vi.fn(),
      variant: 'secondary',
    }) as any;
    expect(result.props.className).toContain('bg-surface-100');
  });

  it('renders ghost variant', () => {
    const result = Button({
      title: 'Link',
      onPress: vi.fn(),
      variant: 'ghost',
    }) as any;
    expect(result.props.className).toContain('bg-transparent');
  });

  it('renders danger variant', () => {
    const result = Button({
      title: 'Delete',
      onPress: vi.fn(),
      variant: 'danger',
    }) as any;
    expect(result.props.className).toContain('bg-red-500');
  });

  it('is disabled when disabled prop is true', () => {
    const handler = vi.fn();
    const result = Button({ title: 'Submit', onPress: handler, disabled: true }) as any;
    expect(result.props.disabled).toBe(true);
    expect(result.props.className).toContain('opacity-50');
  });

  it('shows ActivityIndicator when loading is true', () => {
    const result = Button({ title: 'Submit', onPress: vi.fn(), loading: true }) as any;
    expect(result.props.disabled).toBe(true);
    const children = result.props.children;
    expect(typeNameOf(children)).toBe('ActivityIndicator');
  });

  it('passes onPress handler to Pressable', () => {
    const handler = vi.fn();
    const result = Button({ title: 'Submit', onPress: handler }) as any;
    expect(result.props.onPress).toBe(handler);
  });
});
