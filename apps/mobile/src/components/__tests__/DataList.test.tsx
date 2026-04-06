import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// DataList uses useCallback hook which requires React render context.
// We test its branching logic by examining what the component produces
// for different prop combinations.

// Mock useCallback to pass through
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useCallback: (fn: any) => fn,
  };
});

import { DataList } from '../DataList';

function typeNameOf(node: any): string {
  if (!node) return '';
  if (typeof node.type === 'string') return node.type;
  return node.type?.displayName ?? node.type?.name ?? '';
}

const sampleData = [
  { id: '1', name: 'Gold Ring' },
  { id: '2', name: 'Silver Necklace' },
  { id: '3', name: 'Diamond Earring' },
];

describe('DataList', () => {
  it('renders FlatList with provided data', () => {
    const renderItem = vi.fn();
    const result = DataList({
      data: sampleData,
      renderItem,
      keyExtractor: (item: any) => item.id,
    }) as any;

    expect(typeNameOf(result)).toBe('FlatList');
    expect(result.props.data).toEqual(sampleData);
  });

  it('shows loading indicator when loading with empty data', () => {
    const result = DataList({
      data: [],
      renderItem: vi.fn(),
      keyExtractor: (_: any, i: number) => String(i),
      loading: true,
    }) as any;

    expect(typeNameOf(result)).toBe('View');
    const children = Array.isArray(result.props.children)
      ? result.props.children
      : [result.props.children];
    const hasIndicator = children.some(
      (c: any) => typeNameOf(c) === 'ActivityIndicator',
    );
    expect(hasIndicator).toBe(true);
  });

  it('provides RefreshControl when onRefresh is given', () => {
    const onRefresh = vi.fn();
    const result = DataList({
      data: sampleData,
      renderItem: vi.fn(),
      keyExtractor: (item: any) => item.id,
      onRefresh,
    }) as any;

    expect(result.props.refreshControl).toBeDefined();
    expect(typeNameOf(result.props.refreshControl)).toBe('RefreshControl');
  });

  it('passes ListEmptyComponent when data is empty', () => {
    const result = DataList({
      data: [],
      renderItem: vi.fn(),
      keyExtractor: (_: any, i: number) => String(i),
      emptyTitle: 'No jewelry found',
    }) as any;

    expect(typeNameOf(result)).toBe('FlatList');
    expect(result.props.ListEmptyComponent).toBeDefined();
  });
});
