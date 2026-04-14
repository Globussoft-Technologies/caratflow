// ─── Tests for new Sales screens ────────────────────────────────
// Covers the screens added this session:
//   - (sales)/scanner.tsx
//   - (sales)/my-sales.tsx
//   - (sales)/my-sales/[id].tsx
//   - (sales)/today.tsx (uses trpc.retail.staffDashboard)
//   - (sales)/stock/[id].tsx (uses trpc.inventory.products.getWithStock)
//
// The existing test suite in this directory uses a shallow-render
// convention: call the default export as a function and walk the
// returned element tree. Several of these screens use React hooks
// (useState / useEffect / useCallback), so we install a lightweight
// hook shim for the duration of each render.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── React hook shim ─────────────────────────────────────────────
// Screens use `import { useState, useEffect } from 'react'`, which
// captures the named exports at module load time. We patch the React
// module's exports so hooks work outside of a renderer. State is reset
// per-render via activeRenderStates.

type RenderState = { states: any[]; idx: number };
let activeRender: RenderState | null = null;

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: (init: any) => {
      // Support both in-render calls (via shallowRender) and the rare case
      // where a callback hands back a setter outside the render pass.
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
      /* intentionally skipped during shallow render */
    },
    useCallback: (fn: any) => fn,
    useMemo: (fn: any) => fn(),
    useRef: (init: any) => ({ current: init }),
    default: actual,
  };
});

// ─── Child component mocks ───────────────────────────────────────

vi.mock('@/components/Screen', () => ({
  Screen: ({ children, ...props }: any) => ({
    type: 'Screen',
    props: { ...props, children },
  }),
}));

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

vi.mock('@/components/MoneyDisplay', () => ({
  MoneyDisplay: ({ children, ...props }: any) => ({
    type: 'MoneyDisplay',
    props: { ...props, children },
  }),
}));

vi.mock('@/components/WeightDisplay', () => ({
  WeightDisplay: ({ children, ...props }: any) => ({
    type: 'WeightDisplay',
    props: { ...props, children },
  }),
}));

vi.mock('@/components/Badge', () => ({
  Badge: ({ children, ...props }: any) => ({
    type: 'Badge',
    props: { ...props, children },
  }),
  getStatusVariant: (_status: string) => 'default',
}));

vi.mock('@/components/StatCard', () => ({
  StatCard: ({ children, ...props }: any) => ({
    type: 'StatCard',
    props: { ...props, children },
  }),
}));

vi.mock('@/components/DataList', () => ({
  DataList: ({ children, ...props }: any) => ({
    type: 'DataList',
    props: { ...props, children },
  }),
}));

vi.mock('@/components/BarcodeScanner', () => ({
  BarcodeScanner: ({ children, ...props }: any) => ({
    type: 'BarcodeScanner',
    props: { ...props, children },
  }),
}));

vi.mock('@/utils/money', () => ({
  formatMoneyShort: (v: number) => `$${v}`,
  formatMoney: (v: number, _cc?: string) => `$${v}`,
  decimalToPaise: (v: number) => Math.round(v * 100),
  paiseToDecimal: (v: number) => v / 100,
}));

vi.mock('@/utils/date', () => ({
  formatDate: (v: string) => v,
  formatTime: (v: string) => v,
  formatDateTime: (v: string) => v,
}));

vi.mock('@/utils/purity', () => ({
  finenessToKaratLabel: (fineness: number) => `${fineness}K`,
}));

vi.mock('@/store/auth-store', () => ({
  useAuthStore: Object.assign(
    (selector?: (s: any) => any) => {
      const state = {
        user: {
          id: 'u1',
          firstName: 'Sales',
          lastName: 'Staff',
          email: 's@test.com',
          role: 'SALES_STAFF',
        },
        activeLocationId: 'loc1',
        activeLocationName: 'Main Store',
      };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ user: { id: 'u1', role: 'SALES_STAFF' } }) },
  ),
}));

const setResultFn = vi.fn();

vi.mock('@/store/scan-store', () => ({
  useScanStore: Object.assign(
    (selector?: (s: any) => any) => {
      const state = {
        intent: null,
        result: null,
        setResult: setResultFn,
        request: vi.fn(),
        consume: vi.fn(),
        reset: vi.fn(),
      };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ setResult: setResultFn }) },
  ),
}));

// Expose React Native's Share as a vi-controllable mock.
const shareMock = vi.fn(async () => ({ action: 'sharedAction' }));
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
    TouchableOpacity: mockComponent('TouchableOpacity'),
    ScrollView: mockComponent('ScrollView'),
    FlatList: mockComponent('FlatList'),
    Image: mockComponent('Image'),
    Modal: mockComponent('Modal'),
    ActivityIndicator: mockComponent('ActivityIndicator'),
    RefreshControl: mockComponent('RefreshControl'),
    KeyboardAvoidingView: mockComponent('KeyboardAvoidingView'),
    SafeAreaView: mockComponent('SafeAreaView'),
    Alert: { alert: vi.fn() },
    Share: { share: shareMock },
    Platform: { OS: 'ios', select: (o: any) => o.ios },
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Dimensions: {
      get: () => ({ width: 375, height: 812 }),
      addEventListener: vi.fn(() => ({ remove: vi.fn() })),
    },
  };
});

// ─── tRPC client mock ────────────────────────────────────────────

type QueryState = {
  data: unknown;
  isLoading: boolean;
  error: { message: string } | undefined;
};

const listSalesState: QueryState = {
  data: undefined,
  isLoading: false,
  error: undefined,
};
const getSaleState: QueryState = {
  data: undefined,
  isLoading: false,
  error: undefined,
};
const staffDashboardState: QueryState = {
  data: undefined,
  isLoading: false,
  error: undefined,
};
const productWithStockState: QueryState = {
  data: undefined,
  isLoading: false,
  error: undefined,
};

const refetchFn = vi.fn(async () => {});

vi.mock('@/lib/trpc', () => ({
  trpc: {
    retail: {
      listSales: {
        useQuery: () => ({ ...listSalesState, refetch: refetchFn }),
      },
      getSale: {
        useQuery: () => ({ ...getSaleState, refetch: refetchFn }),
      },
      staffDashboard: {
        useQuery: () => ({ ...staffDashboardState, refetch: refetchFn }),
      },
    },
    inventory: {
      products: {
        getWithStock: {
          useQuery: () => ({ ...productWithStockState, refetch: refetchFn }),
        },
      },
    },
  },
}));

// ─── Overridable expo-router mock ────────────────────────────────

const routerMocks = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  canGoBack: () => true,
};

let searchParams: Record<string, string> = {};

vi.mock('expo-router', () => ({
  useRouter: () => routerMocks,
  useLocalSearchParams: () => searchParams,
  useSegments: () => [],
  Link: ({ children, ...props }: any) => ({
    type: 'Link',
    props: { ...props, children },
  }),
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
  Tabs: Object.assign(
    ({ children, ...props }: any) => ({
      type: 'Tabs',
      props: { ...props, children },
    }),
    {
      Screen: ({ children, ...props }: any) => ({
        type: 'Tabs.Screen',
        props: { ...props, children },
      }),
    },
  ),
  router: routerMocks,
}));

// ─── Helpers ─────────────────────────────────────────────────────

function resetQueryStates() {
  listSalesState.data = undefined;
  listSalesState.isLoading = false;
  listSalesState.error = undefined;
  getSaleState.data = undefined;
  getSaleState.isLoading = false;
  getSaleState.error = undefined;
  staffDashboardState.data = undefined;
  staffDashboardState.isLoading = false;
  staffDashboardState.error = undefined;
  productWithStockState.data = undefined;
  productWithStockState.isLoading = false;
  productWithStockState.error = undefined;
  searchParams = {};
  refetchFn.mockClear();
  routerMocks.push.mockClear();
  routerMocks.replace.mockClear();
  routerMocks.back.mockClear();
  shareMock.mockClear();
  setResultFn.mockClear();
}

/** Shallow-renders a function component with a minimal hook shim. */
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

/**
 * Finds the `@/components/Screen` wrapper (not `Stack.Screen`). We
 * disambiguate by the presence of the `scrollable` / `loading` / `error`
 * props that only the custom Screen accepts.
 */
function findScreenWrapper(tree: any): any {
  const all = findByType(tree, 'Screen');
  const match = all.find(
    (n) =>
      n.props &&
      ('scrollable' in n.props || 'loading' in n.props || 'error' in n.props),
  );
  if (!match) throw new Error('Screen wrapper not found in tree');
  return match;
}

function textContent(tree: any): string {
  const texts: string[] = [];
  flatten(tree).forEach((n) => {
    if (!n) return;
    const c = n.props?.children;
    const pushIfStr = (v: any) => {
      if (typeof v === 'string' || typeof v === 'number') texts.push(String(v));
    };
    if (Array.isArray(c)) c.forEach(pushIfStr);
    else pushIfStr(c);
  });
  return texts.join(' ');
}

// ─── Tests ───────────────────────────────────────────────────────

beforeEach(() => {
  resetQueryStates();
});

describe('Scanner modal (sales/scanner.tsx)', () => {
  it('exports ScannerScreen as default', async () => {
    const mod = await import('../(sales)/scanner');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
    expect(mod.default.name).toBe('ScannerScreen');
  });

  it('renders a BarcodeScanner inside a SafeAreaView', async () => {
    const mod = await import('../(sales)/scanner');
    const tree = shallowRender(mod.default, {});
    expect(findByType(tree, 'BarcodeScanner')).toHaveLength(1);
  });

  it('configures the Stack.Screen as a modal with title', async () => {
    const mod = await import('../(sales)/scanner');
    const tree = shallowRender(mod.default, {});
    // Both `@/components/Screen` and `Stack.Screen` end up named 'Screen';
    // filter to the one with `options.title === 'Scan Barcode'`.
    const stackScreen = findByType(tree, 'Screen').find(
      (n) => n.props?.options?.title === 'Scan Barcode',
    );
    expect(stackScreen).toBeDefined();
    expect(stackScreen.props.options.presentation).toBe('modal');
  });

  it('passes onScanned and onClose handlers to BarcodeScanner', async () => {
    const mod = await import('../(sales)/scanner');
    const tree = shallowRender(mod.default, {});
    const scanner = findByType(tree, 'BarcodeScanner')[0];
    expect(typeof scanner.props.onScanned).toBe('function');
    expect(typeof scanner.props.onClose).toBe('function');
  });

  it('onScanned writes result to scan-store then pops the stack', async () => {
    const mod = await import('../(sales)/scanner');
    const tree = shallowRender(mod.default, {});
    const scanner = findByType(tree, 'BarcodeScanner')[0];
    scanner.props.onScanned('SKU-123', 'qr');
    expect(setResultFn).toHaveBeenCalledWith('SKU-123', 'qr');
    expect(routerMocks.back).toHaveBeenCalled();
  });

  it('onClose triggers router.back', async () => {
    const mod = await import('../(sales)/scanner');
    const tree = shallowRender(mod.default, {});
    const scanner = findByType(tree, 'BarcodeScanner')[0];
    scanner.props.onClose();
    expect(routerMocks.back).toHaveBeenCalled();
  });
});

describe('My Sales list (sales/my-sales.tsx)', () => {
  it('exports MySalesScreen as default', async () => {
    const mod = await import('../(sales)/my-sales');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
    expect(mod.default.name).toBe('MySalesScreen');
  });

  it('renders without crashing in default (empty) state', async () => {
    const mod = await import('../(sales)/my-sales');
    const tree = shallowRender(mod.default, {});
    expect(tree).toBeTruthy();
    const stat = findByType(tree, 'StatCard');
    expect(stat.length).toBe(2);
  });

  it('passes loading flag to DataList while query is pending', async () => {
    listSalesState.isLoading = true;
    const mod = await import('../(sales)/my-sales');
    const tree = shallowRender(mod.default, {});
    const list = findByType(tree, 'DataList')[0];
    expect(list.props.loading).toBe(true);
  });

  it('shows empty state text when items array is empty', async () => {
    listSalesState.data = { items: [], total: 0, totalPaise: 0 };
    const mod = await import('../(sales)/my-sales');
    const tree = shallowRender(mod.default, {});
    const list = findByType(tree, 'DataList')[0];
    expect(list.props.data).toEqual([]);
    expect(list.props.emptyTitle).toMatch(/No sales/);
  });

  it('renders sales items and totals from happy-path data', async () => {
    listSalesState.data = {
      items: [
        {
          id: 's1',
          saleNumber: 'SL-001',
          invoiceNumber: 'INV-001',
          customerName: 'Alice',
          totalPaise: 100000,
          itemCount: 2,
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          createdAt: '2026-04-14T10:00:00Z',
        },
        {
          id: 's2',
          saleNumber: 'SL-002',
          invoiceNumber: null,
          customerName: null,
          totalPaise: 50000,
          itemCount: 1,
          status: 'COMPLETED',
          paymentStatus: 'PARTIAL',
          createdAt: '2026-04-14T11:00:00Z',
        },
      ],
      total: 2,
      totalPaise: 150000,
    };
    const mod = await import('../(sales)/my-sales');
    const tree = shallowRender(mod.default, {});
    const list = findByType(tree, 'DataList')[0];
    expect(list.props.data).toHaveLength(2);
    const stats = findByType(tree, 'StatCard');
    expect(stats[0].props.value).toBe('2');
    expect(stats[1].props.value).toBe('$150000');
  });

  it('tapping a rendered row navigates to the receipt detail', async () => {
    listSalesState.data = {
      items: [
        {
          id: 's1',
          saleNumber: 'SL-001',
          invoiceNumber: 'INV-001',
          customerName: 'Alice',
          totalPaise: 100000,
          itemCount: 2,
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          createdAt: '2026-04-14T10:00:00Z',
        },
      ],
      total: 1,
      totalPaise: 100000,
    };
    const mod = await import('../(sales)/my-sales');
    const tree = shallowRender(mod.default, {});
    const list = findByType(tree, 'DataList')[0];
    const rendered = list.props.renderItem({ item: list.props.data[0] });
    // `rendered.type` is the Card function (JSX element); its name === 'Card'.
    expect(rendered.type?.name ?? rendered.type).toBe('Card');
    rendered.props.onPress();
    expect(routerMocks.push).toHaveBeenCalledWith('/(sales)/my-sales/s1');
  });
});

describe('Sale receipt detail (sales/my-sales/[id].tsx)', () => {
  it('exports SaleReceiptScreen as default', async () => {
    const mod = await import('../(sales)/my-sales/[id]');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
    expect(mod.default.name).toBe('SaleReceiptScreen');
  });

  it('forwards loading flag to the Screen wrapper', async () => {
    searchParams = { id: 'sale-1' };
    getSaleState.isLoading = true;
    const mod = await import('../(sales)/my-sales/[id]');
    const tree = shallowRender(mod.default, {});
    const screen = findScreenWrapper(tree);
    expect(screen.props.loading).toBe(true);
  });

  it('forwards query error message to the Screen wrapper', async () => {
    searchParams = { id: 'sale-1' };
    getSaleState.error = { message: 'boom' } as any;
    const mod = await import('../(sales)/my-sales/[id]');
    const tree = shallowRender(mod.default, {});
    const screen = findScreenWrapper(tree);
    expect(screen.props.error).toBe('boom');
  });

  it('renders line items and a Share Receipt button on happy path', async () => {
    searchParams = { id: 'sale-1' };
    getSaleState.data = {
      id: 'sale-1',
      saleNumber: 'SL-001',
      invoiceNumber: 'INV-001',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      customerName: 'Alice',
      customerPhone: '+91999',
      staffName: 'Sales Staff',
      locationName: 'Main Store',
      createdAt: '2026-04-14T10:00:00Z',
      currencyCode: 'INR',
      subtotalPaise: 10000,
      discountPaise: 500,
      taxPaise: 300,
      totalPaise: 9800,
      lineItems: [
        {
          id: 'li1',
          description: 'Gold Ring 22K',
          sku: 'GR-001',
          quantity: 1,
          metalWeightMg: 5000,
          unitPricePaise: 10000,
          lineTotalPaise: 10000,
        },
      ],
      payments: [
        { id: 'p1', method: 'CASH', amountPaise: 9800, reference: null },
      ],
    };
    const mod = await import('../(sales)/my-sales/[id]');
    const tree = shallowRender(mod.default, {});

    const buttons = findByType(tree, 'Button');
    const shareButton = buttons.find((b) => b.props.title === 'Share Receipt');
    expect(shareButton).toBeDefined();

    const text = textContent(tree);
    expect(text).toContain('Gold Ring 22K');
    expect(text).toContain('Alice');
  });

  it('Share button invokes React Native Share.share with the receipt text', async () => {
    searchParams = { id: 'sale-1' };
    getSaleState.data = {
      id: 'sale-1',
      saleNumber: 'SL-001',
      invoiceNumber: 'INV-001',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      customerName: 'Alice',
      customerPhone: null,
      staffName: 'Staff',
      locationName: 'Main',
      createdAt: '2026-04-14T10:00:00Z',
      currencyCode: 'INR',
      subtotalPaise: 10000,
      discountPaise: 0,
      taxPaise: 0,
      totalPaise: 10000,
      lineItems: [
        {
          id: 'li1',
          description: 'Ring',
          sku: 'R1',
          quantity: 1,
          metalWeightMg: 0,
          unitPricePaise: 10000,
          lineTotalPaise: 10000,
        },
      ],
      payments: [],
    };
    const mod = await import('../(sales)/my-sales/[id]');
    const tree = shallowRender(mod.default, {});
    const shareButton = findByType(tree, 'Button').find(
      (b) => b.props.title === 'Share Receipt',
    );
    expect(shareButton).toBeDefined();
    await shareButton!.props.onPress();
    expect(shareMock).toHaveBeenCalledTimes(1);
    const msg = (shareMock.mock.calls[0][0] as { message: string }).message;
    expect(msg).toContain('Receipt:');
    expect(msg).toContain('Ring x1');
    expect(msg).toContain('Total:');
  });
});

describe('Today staff dashboard (sales/today.tsx)', () => {
  it('exports TodayScreen as default', async () => {
    const mod = await import('../(sales)/today');
    expect(mod.default).toBeDefined();
    expect(mod.default.name).toBe('TodayScreen');
  });

  it('renders with fallback zeroes when no data has arrived', async () => {
    staffDashboardState.data = undefined;
    const mod = await import('../(sales)/today');
    const tree = shallowRender(mod.default, {});
    const stats = findByType(tree, 'StatCard');
    expect(stats[0].props.value).toBe('0');
    expect(stats[1].props.value).toBe('$0');
  });

  it('shows empty-state copy when lists are empty', async () => {
    staffDashboardState.data = {
      mySalesCount: 0,
      myRevenuePaise: 0,
      goldRatePer10g: 0,
      silverRatePer10g: 0,
      pendingRepairs: [],
      recentTransactions: [],
    };
    const mod = await import('../(sales)/today');
    const tree = shallowRender(mod.default, {});
    const text = textContent(tree);
    expect(text).toContain('No repairs assigned');
    expect(text).toContain('No transactions yet today');
  });

  it('renders rates, repairs and recent transactions from happy-path data', async () => {
    staffDashboardState.data = {
      mySalesCount: 5,
      myRevenuePaise: 250000,
      goldRatePer10g: 600000,
      silverRatePer10g: 8000,
      pendingRepairs: [
        {
          id: 'r1',
          repairNumber: 'RP-001',
          customerName: 'Bob',
          status: 'IN_PROGRESS',
          itemDescription: 'Chain soldering',
        },
      ],
      recentTransactions: [
        {
          id: 't1',
          saleNumber: 'SL-010',
          customerName: 'Alice',
          totalPaise: 50000,
          createdAt: '2026-04-14T10:00:00Z',
        },
      ],
    };
    const mod = await import('../(sales)/today');
    const tree = shallowRender(mod.default, {});
    const stats = findByType(tree, 'StatCard');
    expect(stats[0].props.value).toBe('5');
    const text = textContent(tree);
    expect(text).toContain('RP-001');
    expect(text).toContain('SL-010');
    expect(text).toContain('Alice');
  });

  it('wires pull-to-refresh to trpc refetch', async () => {
    staffDashboardState.data = {
      mySalesCount: 0,
      myRevenuePaise: 0,
      goldRatePer10g: 0,
      silverRatePer10g: 0,
      pendingRepairs: [],
      recentTransactions: [],
    };
    const mod = await import('../(sales)/today');
    const tree = shallowRender(mod.default, {});
    const scroll = findByType(tree, 'ScrollView')[0];
    expect(scroll).toBeDefined();
    const refreshControl = scroll.props.refreshControl;
    expect(refreshControl).toBeDefined();
    await refreshControl.props.onRefresh();
    expect(refetchFn).toHaveBeenCalled();
  });
});

describe('Stock detail (sales/stock/[id].tsx)', () => {
  it('exports StockDetailScreen as default', async () => {
    const mod = await import('../(sales)/stock/[id]');
    expect(mod.default).toBeDefined();
    expect(mod.default.name).toBe('StockDetailScreen');
  });

  it('forwards loading to the Screen wrapper', async () => {
    searchParams = { id: 'p1' };
    productWithStockState.isLoading = true;
    const mod = await import('../(sales)/stock/[id]');
    const tree = shallowRender(mod.default, {});
    const screen = findScreenWrapper(tree);
    expect(screen.props.loading).toBe(true);
  });

  it('surfaces query error via Screen error prop', async () => {
    searchParams = { id: 'p1' };
    productWithStockState.error = { message: 'not found' } as any;
    const mod = await import('../(sales)/stock/[id]');
    const tree = shallowRender(mod.default, {});
    const screen = findScreenWrapper(tree);
    expect(screen.props.error).toBe('not found');
  });

  it('renders product header and stock-by-location rows on happy path', async () => {
    searchParams = { id: 'p1' };
    productWithStockState.data = {
      product: {
        id: 'p1',
        sku: 'SKU-1',
        name: '22K Ring',
        productType: 'GOLD_JEWELRY',
        description: 'Nice',
        metalType: 'GOLD',
        purityFineness: 916,
        weightMg: 5000,
        costPricePaise: 400000,
        sellingPricePaise: 500000,
        hsnCode: '7113',
        images: [],
      },
      stockByLocation: [
        {
          locationId: 'loc1',
          locationName: 'Main Store',
          quantity: 3,
          reservedQuantity: 1,
          quantityOnHand: 3,
          quantityAvailable: 2,
        },
        {
          locationId: 'loc2',
          locationName: 'Branch Store',
          quantity: 5,
          reservedQuantity: 0,
          quantityOnHand: 5,
          quantityAvailable: 5,
        },
      ],
    };
    const mod = await import('../(sales)/stock/[id]');
    const tree = shallowRender(mod.default, {});
    const text = textContent(tree);
    expect(text).toContain('22K Ring');
    expect(text).toContain('Main Store');
    expect(text).toContain('Branch Store');
    expect(text).toMatch(/2\s+available/);
    expect(text).toMatch(/5\s+available/);
  });

  it('shows "No stock data available" when stockByLocation is empty', async () => {
    searchParams = { id: 'p1' };
    productWithStockState.data = {
      product: {
        id: 'p1',
        sku: 'SKU-1',
        name: 'Ring',
        productType: 'GOLD_JEWELRY',
        description: null,
        metalType: 'GOLD',
        purityFineness: 0,
        weightMg: 0,
        costPricePaise: 0,
        sellingPricePaise: 0,
        hsnCode: '7113',
        images: [],
      },
      stockByLocation: [],
    };
    const mod = await import('../(sales)/stock/[id]');
    const tree = shallowRender(mod.default, {});
    const text = textContent(tree);
    expect(text).toContain('No stock data available');
  });
});
