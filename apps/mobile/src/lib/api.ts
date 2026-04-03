// ─── API Client for CaratFlow Mobile ────────────────────────────
// Connects to CaratFlow backend with JWT auth, token refresh,
// and base URL from environment variable.

import Constants from 'expo-constants';
import { getToken, setTokens, clearTokens } from './auth';

const BASE_URL: string =
  Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:4000';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  meta?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeToRefresh(cb: (token: string) => void): void {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await getToken('refreshToken');
    if (!refreshToken) return null;

    const response = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await clearTokens();
      return null;
    }

    const data = await response.json();
    if (data.success && data.data?.accessToken) {
      await setTokens(data.data.accessToken, data.data.refreshToken);
      return data.data.accessToken;
    }
    return null;
  } catch {
    await clearTokens();
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, params, headers = {}, signal } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const accessToken = await getToken('accessToken');
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };
  if (accessToken) {
    reqHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: reqHeaders,
    signal,
  };
  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  let response = await fetch(url, fetchOptions);

  // Handle 401 with token refresh
  if (response.status === 401 && accessToken) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        onRefreshed(newToken);
        reqHeaders['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, { ...fetchOptions, headers: reqHeaders });
      } else {
        return {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Session expired. Please log in again.' },
        };
      }
    } else {
      // Wait for the refresh to complete
      const newToken = await new Promise<string>((resolve) => {
        subscribeToRefresh(resolve);
      });
      reqHeaders['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { ...fetchOptions, headers: reqHeaders });
    }
  }

  if (!response.ok) {
    try {
      const errBody = await response.json();
      return {
        success: false,
        error: errBody.error ?? {
          code: `HTTP_${response.status}`,
          message: response.statusText,
        },
      };
    } catch {
      return {
        success: false,
        error: { code: `HTTP_${response.status}`, message: response.statusText },
      };
    }
  }

  return response.json();
}

/** Convenience methods */
export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    apiRequest<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body }),

  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body }),

  delete: <T>(path: string) =>
    apiRequest<T>(path, { method: 'DELETE' }),
};

export { BASE_URL };
