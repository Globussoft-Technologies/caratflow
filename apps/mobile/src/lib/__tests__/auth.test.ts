import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as SecureStore from 'expo-secure-store';

// Mock the api module before importing auth
vi.mock('../api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from '../api';
import {
  getToken,
  setTokens,
  clearTokens,
  login,
  logout,
  getCurrentUser,
  mapRoleToRouteGroup,
} from '../auth';

const mockUser = {
  id: 'u1',
  tenantId: 't1',
  email: 'test@jeweler.in',
  firstName: 'Raj',
  lastName: 'Patel',
  role: 'OWNER' as const,
  permissions: ['all'],
  timezone: 'Asia/Kolkata',
  currencyCode: 'INR',
};

describe('Token Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('setTokens stores both tokens in SecureStore', async () => {
    await setTokens('access-123', 'refresh-456');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'caratflow_access_token',
      'access-123',
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'caratflow_refresh_token',
      'refresh-456',
    );
  });

  it('getToken retrieves a token from SecureStore', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('my-token');

    const token = await getToken('accessToken');
    expect(token).toBe('my-token');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('caratflow_access_token');
  });

  it('getToken returns null when SecureStore throws', async () => {
    vi.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('unavailable'));

    const token = await getToken('accessToken');
    expect(token).toBeNull();
  });

  it('clearTokens removes both tokens', async () => {
    await clearTokens();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('caratflow_access_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('caratflow_refresh_token');
  });
});

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores tokens and returns user on success', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      success: true,
      data: { user: mockUser, accessToken: 'a-tok', refreshToken: 'r-tok' },
    });

    const result = await login({ email: 'test@jeweler.in', password: 'pass' });

    expect(result.user).toEqual(mockUser);
    expect(result.accessToken).toBe('a-tok');
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
  });

  it('throws on failed login', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      success: false,
      error: { code: 'AUTH_FAILED', message: 'Invalid credentials' },
    });

    await expect(login({ email: 'bad@test.com', password: 'wrong' })).rejects.toThrow(
      'Invalid credentials',
    );
  });
});

describe('logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls logout endpoint and clears tokens', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ success: true });

    await logout();

    expect(api.post).toHaveBeenCalledWith('/api/v1/auth/logout');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
  });

  it('clears tokens even if api logout fails', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('network'));

    await logout();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
  });
});

describe('getCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user when token exists and api succeeds', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('valid-token');
    vi.mocked(api.get).mockResolvedValueOnce({ success: true, data: mockUser });

    const user = await getCurrentUser();
    expect(user).toEqual(mockUser);
  });

  it('returns null when no token exists', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(null);

    const user = await getCurrentUser();
    expect(user).toBeNull();
  });
});

describe('mapRoleToRouteGroup', () => {
  it('maps OWNER to (owner)', () => {
    expect(mapRoleToRouteGroup('OWNER')).toBe('(owner)');
  });

  it('maps ADMIN to (owner)', () => {
    expect(mapRoleToRouteGroup('ADMIN')).toBe('(owner)');
  });

  it('maps SALES_STAFF to (sales)', () => {
    expect(mapRoleToRouteGroup('SALES_STAFF')).toBe('(sales)');
  });

  it('maps CUSTOMER to (customer)', () => {
    expect(mapRoleToRouteGroup('CUSTOMER')).toBe('(customer)');
  });

  it('maps AGENT to (agent)', () => {
    expect(mapRoleToRouteGroup('AGENT')).toBe('(agent)');
  });
});
