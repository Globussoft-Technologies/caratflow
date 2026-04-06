import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { BottomSheet } from '../BottomSheet';

function typeNameOf(node: any): string {
  if (!node) return '';
  if (typeof node.type === 'string') return node.type;
  return node.type?.displayName ?? node.type?.name ?? '';
}

describe('BottomSheet', () => {
  it('renders Modal as visible when visible is true', () => {
    const result = BottomSheet({
      visible: true,
      onClose: vi.fn(),
      children: 'Sheet Content',
    }) as any;
    expect(typeNameOf(result)).toBe('Modal');
    expect(result.props.visible).toBe(true);
  });

  it('renders Modal as not visible when visible is false', () => {
    const result = BottomSheet({
      visible: false,
      onClose: vi.fn(),
      children: 'Sheet Content',
    }) as any;
    expect(typeNameOf(result)).toBe('Modal');
    expect(result.props.visible).toBe(false);
  });

  it('calls onClose via onRequestClose', () => {
    const onClose = vi.fn();
    const result = BottomSheet({
      visible: true,
      onClose,
      children: 'Content',
    }) as any;
    expect(result.props.onRequestClose).toBe(onClose);
  });

  it('renders title when provided', () => {
    const result = BottomSheet({
      visible: true,
      onClose: vi.fn(),
      title: 'Filter Options',
      children: 'Content',
    }) as any;
    const serialized = JSON.stringify(result);
    expect(serialized).toContain('Filter Options');
  });

  it('renders children inside the sheet', () => {
    const result = BottomSheet({
      visible: true,
      onClose: vi.fn(),
      children: 'My Content',
    }) as any;
    const serialized = JSON.stringify(result);
    expect(serialized).toContain('My Content');
  });
});
