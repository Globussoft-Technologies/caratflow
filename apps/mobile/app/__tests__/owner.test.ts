import { describe, it, expect, vi } from 'vitest';

// ─── Mock internal modules used by owner screens ────────────────

vi.mock('@/components/StatCard', () => ({
  StatCard: ({ children, ...props }: any) => ({ type: 'StatCard', props: { ...props, children } }),
}));

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

vi.mock('@/components/Input', () => ({
  Input: ({ children, ...props }: any) => ({ type: 'Input', props: { ...props, children } }),
}));

vi.mock('@/components/Button', () => ({
  Button: ({ children, ...props }: any) => ({ type: 'Button', props: { ...props, children } }),
}));

vi.mock('@/components/DataList', () => ({
  DataList: ({ children, ...props }: any) => ({ type: 'DataList', props: { ...props, children } }),
}));

vi.mock('@/hooks/useApi', () => ({
  useApiQuery: () => ({ data: null, isLoading: false, refetch: vi.fn(async () => {}) }),
  useApiMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/store/auth-store', () => ({
  useAuthStore: Object.assign(
    (selector?: (s: any) => any) => {
      const state = {
        user: { id: 'u1', firstName: 'Test', lastName: 'Owner', email: 'test@example.com', role: 'OWNER' },
        activeLocationName: 'Main Store',
        activeLocationId: 'loc1',
        logout: vi.fn(async () => {}),
        setActiveLocation: vi.fn(),
      };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ user: { id: 'u1', firstName: 'Test', lastName: 'Owner', role: 'OWNER' } }) },
  ),
}));

vi.mock('@/store/app-store', () => ({
  useAppStore: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    weightUnit: 'g',
    setWeightUnit: vi.fn(),
  }),
}));

vi.mock('@/utils/money', () => ({
  formatMoneyShort: (v: number) => `$${v}`,
  formatMoney: (v: number) => `$${v}`,
}));

vi.mock('@/utils/date', () => ({
  formatDateTime: (v: string) => v,
  formatDate: (v: string) => v,
  formatTime: (v: string) => v,
}));

// ─── Tests ──────────────────────────────────────────────────────

describe('Owner Screens', () => {
  describe('Dashboard', () => {
    it('exports a default component', async () => {
      const mod = await import('../(owner)/dashboard');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named OwnerDashboardScreen', async () => {
      const mod = await import('../(owner)/dashboard');
      expect(mod.default.name).toBe('OwnerDashboardScreen');
    });
  });

  describe('Approvals', () => {
    it('exports a default component', async () => {
      const mod = await import('../(owner)/approvals');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named ApprovalsScreen', async () => {
      const mod = await import('../(owner)/approvals');
      expect(mod.default.name).toBe('ApprovalsScreen');
    });
  });

  describe('Reports Hub', () => {
    it('exports a default component', async () => {
      const mod = await import('../(owner)/reports');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named ReportsScreen', async () => {
      const mod = await import('../(owner)/reports');
      expect(mod.default.name).toBe('ReportsScreen');
    });
  });

  describe('Reports / Sales', () => {
    it('exports a default component', async () => {
      const mod = await import('../(owner)/reports/sales');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named SalesReportScreen', async () => {
      const mod = await import('../(owner)/reports/sales');
      expect(mod.default.name).toBe('SalesReportScreen');
    });
  });

  describe('Reports / Inventory', () => {
    it('exports a default component', async () => {
      const mod = await import('../(owner)/reports/inventory');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named InventoryReportScreen', async () => {
      const mod = await import('../(owner)/reports/inventory');
      expect(mod.default.name).toBe('InventoryReportScreen');
    });
  });

  describe('Settings', () => {
    it('exports a default component', async () => {
      const mod = await import('../(owner)/settings');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named SettingsScreen', async () => {
      const mod = await import('../(owner)/settings');
      expect(mod.default.name).toBe('SettingsScreen');
    });
  });

  describe('Owner Layout', () => {
    it('exports a default component', async () => {
      const mod = await import('../(owner)/_layout');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named OwnerLayout', async () => {
      const mod = await import('../(owner)/_layout');
      expect(mod.default.name).toBe('OwnerLayout');
    });
  });
});
