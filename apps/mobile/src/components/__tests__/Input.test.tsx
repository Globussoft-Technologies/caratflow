import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { Input } from '../Input';

function typeNameOf(node: any): string {
  if (!node) return '';
  if (typeof node.type === 'string') return node.type;
  return node.type?.displayName ?? node.type?.name ?? '';
}

function findByType(node: any, typeName: string): any {
  if (!node) return null;
  if (typeNameOf(node) === typeName) return node;
  const children = node?.props?.children;
  if (!children) return null;
  const arr = Array.isArray(children) ? children : [children];
  for (const child of arr) {
    if (!child || typeof child === 'string' || typeof child === 'number') continue;
    const found = findByType(child, typeName);
    if (found) return found;
  }
  return null;
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

describe('Input', () => {
  it('renders label when provided', () => {
    const result = Input({ label: 'Email' }) as any;
    expect(typeNameOf(result)).toBe('View');
    const label = findByText(result, 'Email');
    expect(label).toBeDefined();
  });

  it('shows error text when error is provided', () => {
    const result = Input({ error: 'Required field' }) as any;
    const errorText = findByText(result, 'Required field');
    expect(errorText).toBeDefined();
    expect(errorText.props.className).toContain('text-red-500');
  });

  it('passes onChangeText through to TextInput', () => {
    const handler = vi.fn();
    const result = Input({ onChangeText: handler }) as any;
    const textInput = findByType(result, 'TextInput');
    expect(textInput).toBeDefined();
    expect(textInput.props.onChangeText).toBe(handler);
  });

  it('renders placeholder text', () => {
    const result = Input({ placeholder: 'Enter email' }) as any;
    const textInput = findByType(result, 'TextInput');
    expect(textInput).toBeDefined();
    expect(textInput.props.placeholder).toBe('Enter email');
  });
});
