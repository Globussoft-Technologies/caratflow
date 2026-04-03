// ─── Auth Store (Zustand) ───────────────────────────────────────

import { create } from 'zustand';
import type { User, UserRole, LoginInput } from '@/lib/auth';
import {
  login as authLogin,
  logout as authLogout,
  getCurrentUser,
  clearTokens,
} from '@/lib/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  activeLocationId: string | null;
  activeLocationName: string | null;

  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setActiveLocation: (id: string, name: string) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  activeLocationId: null,
  activeLocationName: null,

  login: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await authLogin(input);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        activeLocationId: user.locationId ?? null,
        activeLocationName: user.locationName ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authLogout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        activeLocationId: null,
        activeLocationName: null,
      });
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const user = await getCurrentUser();
      if (user) {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          activeLocationId: user.locationId ?? null,
          activeLocationName: user.locationName ?? null,
        });
      } else {
        await clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setActiveLocation: (id, name) => {
    set({ activeLocationId: id, activeLocationName: name });
  },

  clearError: () => set({ error: null }),
}));

/** Selector for current user role */
export function useUserRole(): UserRole | null {
  return useAuthStore((s) => s.user?.role ?? null);
}
