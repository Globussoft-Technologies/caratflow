import { describe, it, expect } from 'vitest';
import React from 'react';
import { Screen } from '../Screen';

function typeNameOf(node: any): string {
  if (!node) return '';
  if (typeof node.type === 'string') return node.type;
  return node.type?.displayName ?? node.type?.name ?? '';
}

describe('Screen', () => {
  it('renders children when not loading and no error', () => {
    const result = Screen({ children: 'Hello World' }) as any;
    expect(typeNameOf(result)).toBe('SafeAreaView');
    const inner = result.props.children;
    expect(typeNameOf(inner)).toBe('View');
    expect(inner.props.children).toBe('Hello World');
  });

  it('shows loading indicator when loading is true', () => {
    const result = Screen({ children: 'Content', loading: true }) as any;
    expect(typeNameOf(result)).toBe('SafeAreaView');
    const inner = result.props.children;
    expect(typeNameOf(inner)).toBe('View');
    const innerChildren = Array.isArray(inner.props.children)
      ? inner.props.children
      : [inner.props.children];
    const hasActivityIndicator = innerChildren.some(
      (c: any) => typeNameOf(c) === 'ActivityIndicator',
    );
    expect(hasActivityIndicator).toBe(true);
  });

  it('shows error message when error is provided', () => {
    const result = Screen({ children: 'Content', error: 'Something went wrong' }) as any;
    const inner = result.props.children;
    expect(typeNameOf(inner)).toBe('View');
    const textChild = Array.isArray(inner.props.children)
      ? inner.props.children.find((c: any) => typeNameOf(c) === 'Text')
      : inner.props.children;
    expect(textChild?.props?.children).toBe('Something went wrong');
  });

  it('wraps content in SafeAreaView', () => {
    const result = Screen({ children: 'Content' }) as any;
    expect(typeNameOf(result)).toBe('SafeAreaView');
    expect(result.props.className).toContain('flex-1');
  });
});
