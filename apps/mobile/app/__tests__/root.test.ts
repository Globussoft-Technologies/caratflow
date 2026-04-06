import { describe, it, expect, vi } from 'vitest';

// ─── Mock internal modules used by root screens ─────────────────

vi.mock('@/store/auth-store', () => ({
  useAuthStore: Object.assign(
    (selector?: (s: any) => any) => {
      const state = {
        isAuthenticated: false,
        isLoading: true,
        user: null,
        restoreSession: vi.fn(),
      };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ user: null }) },
  ),
}));

vi.mock('@/lib/auth', () => ({
  mapRoleToRouteGroup: vi.fn(() => '(auth)'),
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

describe('Root Screens', () => {
  describe('Index / Splash Screen', () => {
    it('exports a default component', async () => {
      const mod = await import('../index');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named SplashScreen', async () => {
      const mod = await import('../index');
      expect(mod.default.name).toBe('SplashScreen');
    });
  });

  describe('Root Layout', () => {
    it('exports a default component', async () => {
      const mod = await import('../_layout');
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe('function');
    });

    it('is named RootLayout', async () => {
      const mod = await import('../_layout');
      expect(mod.default.name).toBe('RootLayout');
    });
  });
});
