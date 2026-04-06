import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../auth-store';

// Mock the auth lib
vi.mock('@/lib/auth', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  clearTokens: vi.fn(),
}));

import * as authLib from '@/lib/auth';

const mockUser = {
  id: 'u1',
  tenantId: 't1',
  email: 'owner@jeweler.in',
  firstName: 'Raj',
  lastName: 'Patel',
  role: 'OWNER' as const,
  permissions: ['all'],
  timezone: 'Asia/Kolkata',
  currencyCode: 'INR',
  locationId: 'loc1',
  locationName: 'Mumbai Showroom',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset the store to initial state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      activeLocationId: null,
      activeLocationName: null,
    });
    vi.clearAllMocks();
  });

  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
    expect(state.activeLocationId).toBeNull();
    expect(state.activeLocationName).toBeNull();
  });

  it('login sets user and isAuthenticated on success', async () => {
    vi.mocked(authLib.login).mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'access-tok',
      refreshToken: 'refresh-tok',
    });

    await useAuthStore.getState().login({ email: 'owner@jeweler.in', password: 'pass' });

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.activeLocationId).toBe('loc1');
    expect(state.activeLocationName).toBe('Mumbai Showroom');
  });

  it('login sets error on failure', async () => {
    vi.mocked(authLib.login).mockRejectedValueOnce(new Error('Invalid credentials'));

    await expect(
      useAuthStore.getState().login({ email: 'bad@test.com', password: 'wrong' })
    ).rejects.toThrow('Invalid credentials');

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Invalid credentials');
  });

  it('logout clears all user state', async () => {
    // Set up logged-in state
    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      activeLocationId: 'loc1',
      activeLocationName: 'Mumbai Showroom',
    });
    vi.mocked(authLib.logout).mockResolvedValueOnce(undefined);

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.activeLocationId).toBeNull();
    expect(state.activeLocationName).toBeNull();
  });

  it('logout clears state even if api call fails', async () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true, isLoading: false });
    vi.mocked(authLib.logout).mockRejectedValueOnce(new Error('network'));

    // The store's logout uses try/finally (no catch), so the rejection propagates
    // but the finally block still clears state
    try {
      await useAuthStore.getState().logout();
    } catch {
      // Expected
    }

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('restoreSession sets user when token is valid', async () => {
    vi.mocked(authLib.getCurrentUser).mockResolvedValueOnce(mockUser);

    await useAuthStore.getState().restoreSession();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('restoreSession clears tokens when no user found', async () => {
    vi.mocked(authLib.getCurrentUser).mockResolvedValueOnce(null);

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(authLib.clearTokens).toHaveBeenCalled();
  });

  it('restoreSession clears tokens on error', async () => {
    vi.mocked(authLib.getCurrentUser).mockRejectedValueOnce(new Error('fail'));

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(authLib.clearTokens).toHaveBeenCalled();
  });

  it('setActiveLocation updates location fields', () => {
    useAuthStore.getState().setActiveLocation('loc2', 'Delhi Branch');

    const state = useAuthStore.getState();
    expect(state.activeLocationId).toBe('loc2');
    expect(state.activeLocationName).toBe('Delhi Branch');
  });

  it('clearError removes the error message', () => {
    useAuthStore.setState({ error: 'some error' });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('isAuthenticated reflects user presence after login', async () => {
    vi.mocked(authLib.login).mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'tok',
      refreshToken: 'ref',
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    await useAuthStore.getState().login({ email: 'test@test.com', password: 'x' });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
