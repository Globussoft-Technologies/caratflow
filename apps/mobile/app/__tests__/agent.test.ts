import { describe, it, expect, vi } from 'vitest';

// ─── Mock internal modules used by agent screens ────────────────

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

vi.mock('@/components/Button', () => ({
  Button: ({ children, ...props }: any) => ({ type: 'Button', props: { ...props, children } }),
}));

vi.mock('@/components/Input', () => ({
  Input: ({ children, ...props }: any) => ({ type: 'Input', props: { ...props, children } }),
}));

vi.mock('@/components/StatCard', () => ({
  StatCard: ({ children, ...props }: any) => ({ type: 'StatCard', props: { ...props, children } }),
}));

vi.mock('@/components/DataList', () => ({
  DataList: ({ children, ...props }: any) => ({ type: 'DataList', props: { ...props, children } }),
}));

vi.mock('@/components/BottomSheet', () => ({
  BottomSheet: ({ children, ...props }: any) => ({ type: 'BottomSheet', props: { ...props, children } }),
}));

vi.mock('@/components/SearchBar', () => ({
  SearchBar: ({ children, ...props }: any) => ({ type: 'SearchBar', props: { ...props, children } }),
}));

vi.mock('@/hooks/useApi', () => ({
  useApiQuery: () => ({ data: null, isLoading: false, error: null, refetch: vi.fn(async () => {}) }),
  useApiMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/store/auth-store', () => ({
  useAuthStore: Object.assign(
    (selector?: (s: any) => any) => {
      const state = {
        user: { id: 'a1', firstName: 'Agent', lastName: 'User', email: 'a@test.com', role: 'AGENT' },
        activeLocationId: 'loc1',
      };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ user: { id: 'a1', role: 'AGENT' } }) },
  ),
}));

vi.mock('@/utils/money', () => ({
  formatMoneyShort: (v: number) => `$${v}`,
  formatMoney: (v: number) => `$${v}`,
}));

vi.mock('@/utils/date', () => ({
  formatDate: (v: string) => v,
  formatTime: (v: string) => v,
}));

// ─── Tests ──────────────────────────────────────────────────────

describe('Agent Screens', () => {
  describe('Collections', () => {
    it('exports a default component', async () => {
      const mod = await import('../(agent)/collections');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named CollectionsScreen', async () => {
      const mod = await import('../(agent)/collections');
      expect(mod.default.name).toBe('CollectionsScreen');
    });
  });

  describe('Visits', () => {
    it('exports a default component', async () => {
      const mod = await import('../(agent)/visits');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named VisitsScreen', async () => {
      const mod = await import('../(agent)/visits');
      expect(mod.default.name).toBe('VisitsScreen');
    });
  });

  describe('Visits / New', () => {
    it('exports a default component', async () => {
      const mod = await import('../(agent)/visits/new');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named NewVisitScreen', async () => {
      const mod = await import('../(agent)/visits/new');
      expect(mod.default.name).toBe('NewVisitScreen');
    });
  });

  describe('Orders', () => {
    it('exports a default component', async () => {
      const mod = await import('../(agent)/orders');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named AgentOrdersScreen', async () => {
      const mod = await import('../(agent)/orders');
      expect(mod.default.name).toBe('AgentOrdersScreen');
    });
  });

  describe('Dashboard', () => {
    it('exports a default component', async () => {
      const mod = await import('../(agent)/dashboard');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named AgentDashboardScreen', async () => {
      const mod = await import('../(agent)/dashboard');
      expect(mod.default.name).toBe('AgentDashboardScreen');
    });
  });

  describe('Agent Layout', () => {
    it('exports a default component', async () => {
      const mod = await import('../(agent)/_layout');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named AgentLayout', async () => {
      const mod = await import('../(agent)/_layout');
      expect(mod.default.name).toBe('AgentLayout');
    });
  });
});
