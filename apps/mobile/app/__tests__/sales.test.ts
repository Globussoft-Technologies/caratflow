import { describe, it, expect, vi } from 'vitest';

// ─── Mock internal modules used by sales screens ────────────────

vi.mock('@/components/Screen', () => ({
  Screen: ({ children, ...props }: any) => ({ type: 'Screen', props: { ...props, children } }),
}));

vi.mock('@/components/SearchBar', () => ({
  SearchBar: ({ children, ...props }: any) => ({ type: 'SearchBar', props: { ...props, children } }),
}));

vi.mock('@/components/Card', () => ({
  Card: ({ children, ...props }: any) => ({ type: 'Card', props: { ...props, children } }),
}));

vi.mock('@/components/Button', () => ({
  Button: ({ children, ...props }: any) => ({ type: 'Button', props: { ...props, children } }),
}));

vi.mock('@/components/MoneyDisplay', () => ({
  MoneyDisplay: ({ children, ...props }: any) => ({ type: 'MoneyDisplay', props: { ...props, children } }),
}));

vi.mock('@/components/WeightDisplay', () => ({
  WeightDisplay: ({ children, ...props }: any) => ({ type: 'WeightDisplay', props: { ...props, children } }),
}));

vi.mock('@/components/Badge', () => ({
  Badge: ({ children, ...props }: any) => ({ type: 'Badge', props: { ...props, children } }),
  getStatusVariant: (status: string) => 'default',
}));

vi.mock('@/components/StatCard', () => ({
  StatCard: ({ children, ...props }: any) => ({ type: 'StatCard', props: { ...props, children } }),
}));

vi.mock('@/components/Avatar', () => ({
  Avatar: ({ children, ...props }: any) => ({ type: 'Avatar', props: { ...props, children } }),
}));

vi.mock('@/components/DataList', () => ({
  DataList: ({ children, ...props }: any) => ({ type: 'DataList', props: { ...props, children } }),
}));

vi.mock('@/components/BottomSheet', () => ({
  BottomSheet: ({ children, ...props }: any) => ({ type: 'BottomSheet', props: { ...props, children } }),
}));

vi.mock('@/components/Input', () => ({
  Input: ({ children, ...props }: any) => ({ type: 'Input', props: { ...props, children } }),
}));

vi.mock('@/hooks/useApi', () => ({
  useApiQuery: () => ({ data: null, isLoading: false, refetch: vi.fn(async () => {}) }),
  useApiMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/store/auth-store', () => ({
  useAuthStore: Object.assign(
    (selector?: (s: any) => any) => {
      const state = {
        user: { id: 'u1', firstName: 'Sales', lastName: 'Staff', email: 's@test.com', role: 'SALES_STAFF' },
        activeLocationId: 'loc1',
        activeLocationName: 'Main Store',
      };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ user: { id: 'u1', role: 'SALES_STAFF' } }) },
  ),
}));

vi.mock('@/utils/money', () => ({
  formatMoneyShort: (v: number) => `$${v}`,
  formatMoney: (v: number) => `$${v}`,
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

// ─── Tests ──────────────────────────────────────────────────────

describe('Sales Staff Screens', () => {
  describe('Quick Bill', () => {
    it('exports a default component', async () => {
      const mod = await import('../(sales)/bill');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named QuickBillScreen', async () => {
      const mod = await import('../(sales)/bill');
      expect(mod.default.name).toBe('QuickBillScreen');
    });
  });

  describe('Bill / Cart', () => {
    it('exports a default component', async () => {
      const mod = await import('../(sales)/bill/cart');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named CartScreen', async () => {
      const mod = await import('../(sales)/bill/cart');
      expect(mod.default.name).toBe('CartScreen');
    });
  });

  describe('Bill / Payment', () => {
    it('exports a default component', async () => {
      const mod = await import('../(sales)/bill/payment');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named PaymentScreen', async () => {
      const mod = await import('../(sales)/bill/payment');
      expect(mod.default.name).toBe('PaymentScreen');
    });
  });

  describe('Customers List', () => {
    it('exports a default component', async () => {
      const mod = await import('../(sales)/customers');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named CustomersScreen', async () => {
      const mod = await import('../(sales)/customers');
      expect(mod.default.name).toBe('CustomersScreen');
    });
  });

  describe('Customer Detail', () => {
    it('exports a default component', async () => {
      const mod = await import('../(sales)/customers/[id]');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named CustomerDetailScreen', async () => {
      const mod = await import('../(sales)/customers/[id]');
      expect(mod.default.name).toBe('CustomerDetailScreen');
    });
  });

  describe('Stock Lookup', () => {
    it('exports a default component', async () => {
      const mod = await import('../(sales)/stock');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named StockScreen', async () => {
      const mod = await import('../(sales)/stock');
      expect(mod.default.name).toBe('StockScreen');
    });
  });

  describe('Stock Detail', () => {
    it('exports a default component', async () => {
      const mod = await import('../(sales)/stock/[id]');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named StockDetailScreen', async () => {
      const mod = await import('../(sales)/stock/[id]');
      expect(mod.default.name).toBe('StockDetailScreen');
    });
  });

  describe('Today Summary', () => {
    it('exports a default component', async () => {
      const mod = await import('../(sales)/today');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named TodayScreen', async () => {
      const mod = await import('../(sales)/today');
      expect(mod.default.name).toBe('TodayScreen');
    });
  });

  describe('Sales Layout', () => {
    it('exports a default component', async () => {
      const mod = await import('../(sales)/_layout');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named SalesLayout', async () => {
      const mod = await import('../(sales)/_layout');
      expect(mod.default.name).toBe('SalesLayout');
    });
  });
});
