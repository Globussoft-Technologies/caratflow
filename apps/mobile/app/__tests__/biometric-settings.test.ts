// ─── Tests for (sales)/settings/biometric.tsx ────────────────────
// Uses the same shallow-render style as sales-new-screens.test.ts:
// hook shim for the duration of each render and mocked components.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

type RenderState = { states: any[]; idx: number };
let activeRender: RenderState | null = null;

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: (init: any) => {
      if (!activeRender) {
        let val = typeof init === 'function' ? init() : init;
        const setter = (v: any) => {
          val = typeof v === 'function' ? v(val) : v;
        };
        return [val, setter];
      }
      const i = activeRender.idx++;
      const cell = activeRender;
      if (!(i in cell.states)) {
        cell.states[i] = typeof init === 'function' ? init() : init;
      }
      return [
        cell.states[i],
        (v: any) => {
          cell.states[i] = typeof v === 'function' ? v(cell.states[i]) : v;
        },
      ];
    },
    useEffect: () => {
      /* skipped during shallow render */
    },
    useCallback: (fn: any) => fn,
    useMemo: (fn: any) => fn(),
    useRef: (init: any) => ({ current: init }),
    default: actual,
  };
});

// ─── Component mocks ────────────────────────────────────────────

vi.mock('@/components/Card', () => ({
  Card: ({ children, ...props }: any) => ({
    type: 'Card',
    props: { ...props, children },
  }),
}));

vi.mock('@/components/Button', () => ({
  Button: ({ children, ...props }: any) => ({
    type: 'Button',
    props: { ...props, children },
  }),
}));

vi.mock('@/components/Input', () => ({
  Input: ({ children, ...props }: any) => ({
    type: 'Input',
    props: { ...props, children },
  }),
}));

vi.mock('@/components/Badge', () => ({
  Badge: ({ children, ...props }: any) => ({
    type: 'Badge',
    props: { ...props, children },
  }),
}));

vi.mock('@/utils/money', () => ({
  formatMoney: (v: number) => `INR ${(v / 100).toFixed(2)}`,
  decimalToPaise: (v: number) => Math.round(v * 100),
  paiseToDecimal: (v: number) => v / 100,
}));

vi.mock('react-native', async () => {
  const mockComponent = (name: string) => {
    const c = ({ children, ...props }: any) => ({
      type: name,
      props: { ...props, children },
    });
    c.displayName = name;
    return c;
  };
  return {
    View: mockComponent('View'),
    Text: mockComponent('Text'),
    TextInput: mockComponent('TextInput'),
    Pressable: mockComponent('Pressable'),
    ScrollView: mockComponent('ScrollView'),
    Switch: mockComponent('Switch'),
    SafeAreaView: mockComponent('SafeAreaView'),
    Alert: { alert: vi.fn() },
    Platform: { OS: 'ios', select: (o: any) => o.ios },
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  };
});

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => ({
    type: 'SafeAreaView',
    props: { ...props, children },
  }),
}));

vi.mock('expo-router', () => ({
  Stack: Object.assign(
    ({ children, ...props }: any) => ({
      type: 'Stack',
      props: { ...props, children },
    }),
    {
      Screen: ({ children, ...props }: any) => ({
        type: 'Stack.Screen',
        props: { ...props, children },
      }),
    },
  ),
}));

vi.mock('@/lib/biometric', () => ({
  isBiometricAvailable: vi.fn(async () => ({ available: true, type: 'FaceID' })),
  authenticateWithBiometric: vi.fn(async () => ({ success: true })),
  loadBiometricSettings: vi.fn(async () => ({
    enabled: false,
    thresholdPaise: 50_000_00,
  })),
  saveBiometricSettings: vi.fn(async () => {}),
  DEFAULT_BIOMETRIC_SETTINGS: { enabled: false, thresholdPaise: 50_000_00 },
}));

// ─── Helpers ────────────────────────────────────────────────────

function shallowRender<P>(Component: (props: P) => any, props: P): any {
  const previous = activeRender;
  activeRender = { states: [], idx: 0 };
  try {
    return Component(props);
  } finally {
    activeRender = previous;
  }
}

function flatten(node: any, out: any[] = []): any[] {
  if (node === null || node === undefined || typeof node === 'boolean') return out;
  if (Array.isArray(node)) {
    node.forEach((c) => flatten(c, out));
    return out;
  }
  if (typeof node !== 'object') return out;
  out.push(node);
  const children = node.props?.children;
  if (children !== undefined) flatten(children, out);
  return out;
}

function findByType(tree: any, typeName: string): any[] {
  return flatten(tree).filter((n) => {
    if (!n || !n.type) return false;
    if (typeof n.type === 'string') return n.type === typeName;
    return n.type.displayName === typeName || n.type.name === typeName;
  });
}

function textContent(tree: any): string {
  const texts: string[] = [];
  flatten(tree).forEach((n) => {
    const c = n.props?.children;
    const pushIfStr = (v: any) => {
      if (typeof v === 'string' || typeof v === 'number') texts.push(String(v));
    };
    if (Array.isArray(c)) c.forEach(pushIfStr);
    else pushIfStr(c);
  });
  return texts.join(' ');
}

// ─── Tests ──────────────────────────────────────────────────────
// Static import is safe here — vi.mock() calls above are hoisted
// by Vitest before any imports, so the mocked modules are in place.
// eslint-disable-next-line import/first
import BiometricSettingsScreen from '../(sales)/settings/biometric';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Biometric settings screen', () => {
  it('exports a default component function', () => {
    expect(BiometricSettingsScreen).toBeDefined();
    expect(typeof BiometricSettingsScreen).toBe('function');
  });

  it('renders a Switch, Input and Button', () => {
    const tree = shallowRender(BiometricSettingsScreen as any, {});
    expect(findByType(tree, 'Switch').length).toBeGreaterThan(0);
    expect(findByType(tree, 'Input').length).toBeGreaterThan(0);
    expect(findByType(tree, 'Button').length).toBeGreaterThan(0);
  });

  it('includes a Test biometric button label', () => {
    const tree = shallowRender(BiometricSettingsScreen as any, {});
    const buttons = findByType(tree, 'Button');
    const titles = buttons.map((b) => b.props?.title ?? '').join(' ');
    expect(titles).toMatch(/Test biometric/i);
  });

  it('renders a threshold input with decimal-pad keyboard', () => {
    const tree = shallowRender(BiometricSettingsScreen as any, {});
    const inputs = findByType(tree, 'Input');
    const threshold = inputs.find(
      (i) => i.props?.keyboardType === 'decimal-pad',
    );
    expect(threshold).toBeDefined();
  });

  it('mentions the Require biometric copy', () => {
    const tree = shallowRender(BiometricSettingsScreen as any, {});
    expect(textContent(tree)).toMatch(
      /Require biometric for high-value sales/i,
    );
  });
});
