import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { TabBar } from '../TabBar';

function createMockTabBarProps(activeIndex: number = 0) {
  const routes = [
    { key: 'dashboard-key', name: 'dashboard' },
    { key: 'sales-key', name: 'sales' },
    { key: 'settings-key', name: 'settings' },
  ];

  const descriptors: Record<string, any> = {};
  routes.forEach((r) => {
    descriptors[r.key] = {
      options: { tabBarAccessibilityLabel: r.name },
    };
  });

  return {
    state: {
      routes,
      index: activeIndex,
    },
    descriptors,
    navigation: {
      emit: vi.fn(() => ({ defaultPrevented: false })),
      navigate: vi.fn(),
    },
    tabs: [
      { label: 'Dashboard', icon: 'D' },
      { label: 'Sales', icon: 'S' },
      { label: 'Settings', icon: 'G' },
    ],
  };
}

describe('TabBar', () => {
  it('renders all tab items', () => {
    const props = createMockTabBarProps(0);
    const result = TabBar(props as any) as any;
    const children = result.props.children;
    expect(children).toHaveLength(3);
  });

  it('highlights the active tab', () => {
    const props = createMockTabBarProps(1);
    const result = TabBar(props as any) as any;
    const children = result.props.children;
    const activeTab = children[1];
    expect(activeTab.props.accessibilityState).toEqual({ selected: true });
    const inactiveTab = children[0];
    expect(inactiveTab.props.accessibilityState).toEqual({});
  });

  it('calls navigation.navigate on press of inactive tab', () => {
    const props = createMockTabBarProps(0);
    const result = TabBar(props as any) as any;
    const children = result.props.children;
    const secondTab = children[1];
    secondTab.props.onPress();

    expect(props.navigation.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'sales-key' }),
    );
    expect(props.navigation.navigate).toHaveBeenCalledWith('sales');
  });
});
