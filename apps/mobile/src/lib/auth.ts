// ─── Auth Service for CaratFlow Mobile ──────────────────────────
// JWT stored in SecureStore, not AsyncStorage.

import * as SecureStore from 'expo-secure-store';
import { api } from './api';

const TOKEN_KEYS = {
  accessToken: 'caratflow_access_token',
  refreshToken: 'caratflow_refresh_token',
} as const;

export type TokenKey = keyof typeof TOKEN_KEYS;

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
  timezone: string;
  currencyCode: string;
  locationId?: string;
  locationName?: string;
}

export type UserRole = 'OWNER' | 'ADMIN' | 'SALES_STAFF' | 'CUSTOMER' | 'AGENT';

export interface LoginInput {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ─── Token Management ───────────────────────────────────────────

export async function getToken(key: TokenKey): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEYS[key]);
  } catch {
    return null;
  }
}

export async function setTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEYS.accessToken, accessToken);
  await SecureStore.setItemAsync(TOKEN_KEYS.refreshToken, refreshToken);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEYS.accessToken);
  await SecureStore.deleteItemAsync(TOKEN_KEYS.refreshToken);
}

// ─── Auth Operations ────────────────────────────────────────────

export async function login(input: LoginInput): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/api/v1/auth/login', input);

  if (!response.success || !response.data) {
    throw new Error(response.error?.message ?? 'Login failed');
  }

  const { accessToken, refreshToken, user } = response.data;
  await setTokens(accessToken, refreshToken);
  return { user, accessToken, refreshToken };
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/v1/auth/logout');
  } catch {
    // Ignore errors on logout
  } finally {
    await clearTokens();
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const token = await getToken('accessToken');
  if (!token) return null;

  const response = await api.get<User>('/api/v1/auth/me');
  if (response.success && response.data) {
    return response.data;
  }
  return null;
}

export async function forgotPassword(email: string): Promise<void> {
  const response = await api.post('/api/v1/auth/forgot-password', { email });
  if (!response.success) {
    throw new Error(response.error?.message ?? 'Failed to send reset email');
  }
}

export function mapRoleToRouteGroup(role: UserRole): string {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return '(owner)';
    case 'SALES_STAFF':
      return '(sales)';
    case 'CUSTOMER':
      return '(customer)';
    case 'AGENT':
      return '(agent)';
    default:
      return '(auth)';
  }
}
