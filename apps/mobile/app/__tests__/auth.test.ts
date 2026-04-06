import { describe, it, expect, vi } from 'vitest';

// ─── Mock internal modules used by auth screens ─────────────────

vi.mock('@/components/Input', () => ({
  Input: ({ children, ...props }: any) => ({ type: 'Input', props: { ...props, children } }),
}));

vi.mock('@/components/Button', () => ({
  Button: ({ children, ...props }: any) => ({ type: 'Button', props: { ...props, children } }),
}));

vi.mock('@/store/auth-store', () => ({
  useAuthStore: Object.assign(
    (selector?: (s: any) => any) => {
      const state = {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        login: vi.fn(),
        clearError: vi.fn(),
        restoreSession: vi.fn(),
      };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ user: null }) },
  ),
}));

vi.mock('@/lib/auth', () => ({
  mapRoleToRouteGroup: vi.fn((role: string) => {
    switch (role) {
      case 'OWNER': return '(owner)';
      case 'SALES_STAFF': return '(sales)';
      case 'CUSTOMER': return '(customer)';
      case 'AGENT': return '(agent)';
      default: return '(auth)';
    }
  }),
  forgotPassword: vi.fn(async () => {}),
}));

vi.mock('@/lib/notifications', () => ({
  addNotificationListeners: vi.fn(() => vi.fn()),
}));

vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn(() => ({})),
  QueryClientProvider: ({ children }: any) => children,
}));

vi.mock('expo-status-bar', () => ({
  StatusBar: ({ children, ...props }: any) => ({ type: 'StatusBar', props: { ...props, children } }),
}));

vi.mock('../global.css', () => ({}));

// ─── Tests ──────────────────────────────────────────────────────

describe('Auth Screens', () => {
  describe('Login Screen', () => {
    it('exports a default component', async () => {
      const mod = await import('../(auth)/login');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named LoginScreen', async () => {
      const mod = await import('../(auth)/login');
      expect(mod.default.name).toBe('LoginScreen');
    });
  });

  describe('Forgot Password Screen', () => {
    it('exports a default component', async () => {
      const mod = await import('../(auth)/forgot-password');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named ForgotPasswordScreen', async () => {
      const mod = await import('../(auth)/forgot-password');
      expect(mod.default.name).toBe('ForgotPasswordScreen');
    });
  });

  describe('Auth Layout', () => {
    it('exports a default component', async () => {
      const mod = await import('../(auth)/_layout');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named AuthLayout', async () => {
      const mod = await import('../(auth)/_layout');
      expect(mod.default.name).toBe('AuthLayout');
    });
  });

  describe('mapRoleToRouteGroup helper', () => {
    it('maps OWNER to (owner)', async () => {
      const { mapRoleToRouteGroup } = await import('@/lib/auth');
      expect(mapRoleToRouteGroup('OWNER')).toBe('(owner)');
    });

    it('maps SALES_STAFF to (sales)', async () => {
      const { mapRoleToRouteGroup } = await import('@/lib/auth');
      expect(mapRoleToRouteGroup('SALES_STAFF')).toBe('(sales)');
    });

    it('maps CUSTOMER to (customer)', async () => {
      const { mapRoleToRouteGroup } = await import('@/lib/auth');
      expect(mapRoleToRouteGroup('CUSTOMER')).toBe('(customer)');
    });
  });
});
