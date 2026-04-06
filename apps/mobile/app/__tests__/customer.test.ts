import { describe, it, expect, vi } from 'vitest';

// ─── Mock internal modules used by customer screens ─────────────

vi.mock('@/components/Card', () => ({
  Card: ({ children, ...props }: any) => ({ type: 'Card', props: { ...props, children } }),
}));

vi.mock('@/components/Badge', () => ({
  Badge: ({ children, ...props }: any) => ({ type: 'Badge', props: { ...props, children } }),
  getStatusVariant: (status: string) => 'default',
}));

vi.mock('@/components/MoneyDisplay', () => ({
  MoneyDisplay: ({ children, ...props }: any) => ({ type: 'MoneyDisplay', props: { ...props, children } }),
}));

vi.mock('@/components/WeightDisplay', () => ({
  WeightDisplay: ({ children, ...props }: any) => ({ type: 'WeightDisplay', props: { ...props, children } }),
}));

vi.mock('@/components/Button', () => ({
  Button: ({ children, ...props }: any) => ({ type: 'Button', props: { ...props, children } }),
}));

vi.mock('@/components/Input', () => ({
  Input: ({ children, ...props }: any) => ({ type: 'Input', props: { ...props, children } }),
}));

vi.mock('@/components/Avatar', () => ({
  Avatar: ({ children, ...props }: any) => ({ type: 'Avatar', props: { ...props, children } }),
}));

vi.mock('@/components/SearchBar', () => ({
  SearchBar: ({ children, ...props }: any) => ({ type: 'SearchBar', props: { ...props, children } }),
}));

vi.mock('@/components/DataList', () => ({
  DataList: ({ children, ...props }: any) => ({ type: 'DataList', props: { ...props, children } }),
}));

vi.mock('@/components/BottomSheet', () => ({
  BottomSheet: ({ children, ...props }: any) => ({ type: 'BottomSheet', props: { ...props, children } }),
}));

vi.mock('@/components/Screen', () => ({
  Screen: ({ children, ...props }: any) => ({ type: 'Screen', props: { ...props, children } }),
}));

vi.mock('@/hooks/useApi', () => ({
  useApiQuery: () => ({ data: null, isLoading: false, error: null, refetch: vi.fn(async () => {}) }),
  useApiMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/store/auth-store', () => ({
  useAuthStore: Object.assign(
    (selector?: (s: any) => any) => {
      const state = {
        user: { id: 'c1', firstName: 'Customer', lastName: 'User', email: 'c@test.com', role: 'CUSTOMER' },
        logout: vi.fn(async () => {}),
      };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ user: { id: 'c1', role: 'CUSTOMER' } }) },
  ),
}));

vi.mock('@/utils/money', () => ({
  formatMoney: (v: number) => `$${v}`,
  formatMoneyShort: (v: number) => `$${v}`,
}));

vi.mock('@/utils/date', () => ({
  formatDate: (v: string) => v,
  formatTime: (v: string) => v,
}));

vi.mock('@/utils/purity', () => ({
  finenessToKaratLabel: (fineness: number) => `${fineness}K`,
}));

// ─── Tests ──────────────────────────────────────────────────────

describe('Customer Screens', () => {
  describe('Home', () => {
    it('exports a default component', async () => {
      const mod = await import('../(customer)/home');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named CustomerHomeScreen', async () => {
      const mod = await import('../(customer)/home');
      expect(mod.default.name).toBe('CustomerHomeScreen');
    });
  });

  describe('Passbook', () => {
    it('exports a default component', async () => {
      const mod = await import('../(customer)/passbook');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named PassbookScreen', async () => {
      const mod = await import('../(customer)/passbook');
      expect(mod.default.name).toBe('PassbookScreen');
    });
  });

  describe('Passbook / Loyalty', () => {
    it('exports a default component', async () => {
      const mod = await import('../(customer)/passbook/loyalty');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named LoyaltyScreen', async () => {
      const mod = await import('../(customer)/passbook/loyalty');
      expect(mod.default.name).toBe('LoyaltyScreen');
    });
  });

  describe('Passbook / Scheme Detail', () => {
    it('exports a default component', async () => {
      const mod = await import('../(customer)/passbook/scheme/[id]');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named SchemeDetailScreen', async () => {
      const mod = await import('../(customer)/passbook/scheme/[id]');
      expect(mod.default.name).toBe('SchemeDetailScreen');
    });
  });

  describe('Catalog', () => {
    it('exports a default component', async () => {
      const mod = await import('../(customer)/catalog');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named CatalogScreen', async () => {
      const mod = await import('../(customer)/catalog');
      expect(mod.default.name).toBe('CatalogScreen');
    });
  });

  describe('Catalog / Product Detail', () => {
    it('exports a default component', async () => {
      const mod = await import('../(customer)/catalog/[id]');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named ProductDetailScreen', async () => {
      const mod = await import('../(customer)/catalog/[id]');
      expect(mod.default.name).toBe('ProductDetailScreen');
    });
  });

  describe('Profile', () => {
    it('exports a default component', async () => {
      const mod = await import('../(customer)/profile');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named ProfileScreen', async () => {
      const mod = await import('../(customer)/profile');
      expect(mod.default.name).toBe('ProfileScreen');
    });
  });

  describe('Customer Layout', () => {
    it('exports a default component', async () => {
      const mod = await import('../(customer)/_layout');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named CustomerLayout', async () => {
      const mod = await import('../(customer)/_layout');
      expect(mod.default.name).toBe('CustomerLayout');
    });
  });
});
