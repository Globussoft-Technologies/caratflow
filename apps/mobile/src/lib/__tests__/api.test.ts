import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock auth module
vi.mock('../auth', () => ({
  getToken: vi.fn(),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
}));

import { getToken, setTokens, clearTokens } from '../auth';

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Import after mocks
import { apiRequest, api, BASE_URL } from '../api';

describe('BASE_URL', () => {
  it('defaults to localhost from mocked expo-constants', () => {
    expect(BASE_URL).toBe('http://localhost:4000');
  });
});

describe('apiRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds Authorization header when token exists', async () => {
    vi.mocked(getToken).mockResolvedValueOnce('my-access-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { id: 1 } }),
    });

    await apiRequest('/api/v1/items');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/items',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-access-token',
        }),
      }),
    );
  });

  it('does not add Authorization header when no token', async () => {
    vi.mocked(getToken).mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await apiRequest('/api/v1/public');

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it('appends query params to URL', async () => {
    vi.mocked(getToken).mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await apiRequest('/api/v1/items', {
      params: { page: 1, limit: 20 },
    });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('page=1');
    expect(url).toContain('limit=20');
  });

  it('handles 401 by attempting token refresh', async () => {
    vi.mocked(getToken)
      .mockResolvedValueOnce('expired-token') // initial accessToken
      .mockResolvedValueOnce('old-refresh'); // refreshToken for refresh call

    // First call returns 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'Expired' } }),
    });

    // Refresh call succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
      }),
    });

    // Retry with new token succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { id: 1 } }),
    });

    const result = await apiRequest('/api/v1/items');

    expect(setTokens).toHaveBeenCalledWith('new-access', 'new-refresh');
    expect(result.success).toBe(true);
  });

  it('returns UNAUTHORIZED error when refresh fails', async () => {
    vi.mocked(getToken)
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('old-refresh');

    // 401 response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    // Refresh fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    const result = await apiRequest('/api/v1/items');

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UNAUTHORIZED');
    expect(clearTokens).toHaveBeenCalled();
  });

  it('handles non-ok response with error body', async () => {
    vi.mocked(getToken).mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      json: async () => ({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid data' },
      }),
    });

    const result = await apiRequest('/api/v1/items', {
      method: 'POST',
      body: {},
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('handles network errors gracefully', async () => {
    vi.mocked(getToken).mockResolvedValueOnce(null);
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(apiRequest('/api/v1/items')).rejects.toThrow('Network request failed');
  });

  it('sends JSON body for POST requests', async () => {
    vi.mocked(getToken).mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await apiRequest('/api/v1/items', {
      method: 'POST',
      body: { name: 'Ring', weight: 5000 },
    });

    const fetchOptions = mockFetch.mock.calls[0][1];
    expect(fetchOptions.method).toBe('POST');
    expect(fetchOptions.body).toBe(JSON.stringify({ name: 'Ring', weight: 5000 }));
  });
});

describe('api convenience methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getToken).mockResolvedValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
  });

  it('api.get calls with GET method', async () => {
    await api.get('/api/v1/items');
    expect(mockFetch.mock.calls[0][1].method).toBe('GET');
  });

  it('api.post calls with POST method', async () => {
    await api.post('/api/v1/items', { name: 'test' });
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
  });

  it('api.delete calls with DELETE method', async () => {
    await api.delete('/api/v1/items/1');
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
  });
});
