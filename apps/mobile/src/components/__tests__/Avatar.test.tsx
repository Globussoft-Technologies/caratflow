import { describe, it, expect } from 'vitest';
import React from 'react';
import { Avatar } from '../Avatar';

function typeNameOf(node: any): string {
  if (!node) return '';
  if (typeof node.type === 'string') return node.type;
  return node.type?.displayName ?? node.type?.name ?? '';
}

describe('Avatar', () => {
  it('renders initials from a two-word name', () => {
    const result = Avatar({ name: 'Raj Patel' }) as any;
    expect(typeNameOf(result)).toBe('View');
    const textChild = result.props.children;
    expect(typeNameOf(textChild)).toBe('Text');
    expect(textChild.props.children).toBe('RP');
  });

  it('renders first two chars for a single-word name', () => {
    const result = Avatar({ name: 'Admin' }) as any;
    const textChild = result.props.children;
    expect(textChild.props.children).toBe('AD');
  });

  it('applies a deterministic background color based on name', () => {
    const result1 = Avatar({ name: 'Raj Patel' }) as any;
    const result2 = Avatar({ name: 'Raj Patel' }) as any;
    expect(result1.props.className).toBe(result2.props.className);
    expect(result1.props.className).toMatch(/bg-/);
  });

  it('renders Image when imageUri is provided', () => {
    const result = Avatar({
      name: 'Raj',
      imageUri: 'https://example.com/photo.jpg',
    }) as any;
    expect(typeNameOf(result)).toBe('Image');
    expect(result.props.source).toEqual({ uri: 'https://example.com/photo.jpg' });
  });

  it('applies correct size classes', () => {
    const sm = Avatar({ name: 'A', size: 'sm' }) as any;
    const lg = Avatar({ name: 'A', size: 'lg' }) as any;
    expect(sm.props.className).toContain('w-8 h-8');
    expect(lg.props.className).toContain('w-14 h-14');
  });
});
