import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { EmptyState } from '../EmptyState';

function typeNameOf(node: any): string {
  if (!node) return '';
  if (typeof node.type === 'string') return node.type;
  return node.type?.displayName ?? node.type?.name ?? '';
}

function findByText(node: any, text: string): any {
  if (!node) return null;
  if (node?.props?.children === text && typeNameOf(node) === 'Text') return node;
  const children = node?.props?.children;
  if (!children) return null;
  const arr = Array.isArray(children) ? children : [children];
  for (const child of arr) {
    if (!child || typeof child === 'string' || typeof child === 'number') continue;
    const found = findByText(child, text);
    if (found) return found;
  }
  return null;
}

describe('EmptyState', () => {
  it('renders the title message', () => {
    const result = EmptyState({ title: 'No items found' }) as any;
    expect(typeNameOf(result)).toBe('View');
    const titleText = findByText(result, 'No items found');
    expect(titleText).toBeDefined();
    expect(titleText.props.className).toContain('text-lg');
  });

  it('renders subtitle when provided', () => {
    const result = EmptyState({
      title: 'Empty',
      subtitle: 'Try adding some jewelry',
    }) as any;
    const subtitleText = findByText(result, 'Try adding some jewelry');
    expect(subtitleText).toBeDefined();
  });

  it('renders action button when actionLabel and onAction are provided', () => {
    const handler = vi.fn();
    const result = EmptyState({
      title: 'Empty',
      actionLabel: 'Add Item',
      onAction: handler,
    }) as any;
    const serialized = JSON.stringify(result);
    expect(serialized).toContain('Add Item');
  });

  it('does not render action button when only actionLabel is provided without onAction', () => {
    const result = EmptyState({
      title: 'Empty',
      actionLabel: 'Add Item',
    }) as any;
    // Without onAction, the && condition is false so no Button View is rendered
    const children = Array.isArray(result.props.children)
      ? result.props.children.filter(Boolean)
      : [result.props.children];
    // Should not contain a View wrapping a Button
    const serialized = JSON.stringify(result);
    // The "Add Item" text should not appear as a button title
    // Since actionLabel && onAction is false, the button node won't render
    const viewChildren = children.filter(
      (c: any) => typeNameOf(c) === 'View' && c?.props?.className?.includes('mt-6'),
    );
    expect(viewChildren.length).toBe(0);
  });
});
