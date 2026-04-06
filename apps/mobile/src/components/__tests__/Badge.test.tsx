import { describe, it, expect } from 'vitest';
import React from 'react';
import { Badge, getStatusVariant } from '../Badge';

function typeNameOf(node: any): string {
  if (!node) return '';
  if (typeof node.type === 'string') return node.type;
  return node.type?.displayName ?? node.type?.name ?? '';
}

describe('Badge', () => {
  it('renders the label text', () => {
    const result = Badge({ label: 'Active' }) as any;
    expect(typeNameOf(result)).toBe('View');
    const textChild = result.props.children;
    expect(typeNameOf(textChild)).toBe('Text');
    expect(textChild.props.children).toBe('Active');
  });

  it('applies success variant styles', () => {
    const result = Badge({ label: 'Paid', variant: 'success' }) as any;
    expect(result.props.className).toContain('bg-green-100');
    const textChild = result.props.children;
    expect(textChild.props.className).toContain('text-green-700');
  });

  it('applies danger variant styles', () => {
    const result = Badge({ label: 'Overdue', variant: 'danger' }) as any;
    expect(result.props.className).toContain('bg-red-100');
  });

  it('applies default variant when no variant specified', () => {
    const result = Badge({ label: 'Unknown' }) as any;
    expect(result.props.className).toContain('bg-surface-200');
  });
});

describe('getStatusVariant', () => {
  it('returns success for ACTIVE', () => {
    expect(getStatusVariant('ACTIVE')).toBe('success');
  });

  it('returns success for PAID', () => {
    expect(getStatusVariant('PAID')).toBe('success');
  });

  it('returns warning for PENDING', () => {
    expect(getStatusVariant('PENDING')).toBe('warning');
  });

  it('returns danger for CANCELLED', () => {
    expect(getStatusVariant('CANCELLED')).toBe('danger');
  });

  it('returns danger for OVERDUE', () => {
    expect(getStatusVariant('OVERDUE')).toBe('danger');
  });

  it('returns info for READY', () => {
    expect(getStatusVariant('READY')).toBe('info');
  });

  it('returns default for unknown status', () => {
    expect(getStatusVariant('RANDOM')).toBe('default');
  });

  it('is case-insensitive', () => {
    expect(getStatusVariant('active')).toBe('success');
    expect(getStatusVariant('pending')).toBe('warning');
  });
});
