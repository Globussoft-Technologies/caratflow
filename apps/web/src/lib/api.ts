const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface FetchOptions extends RequestInit {
  json?: unknown;
}

async function fetchApi<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { json, headers: customHeaders, ...rest } = options;
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/api/v1${path}`, {
    headers,
    body: json ? JSON.stringify(json) : undefined,
    ...rest,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message ?? 'Request failed');
  }

  return data;
}

export const api = {
  get: <T>(path: string) => fetchApi<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) => fetchApi<T>(path, { method: 'POST', json: body }),
  put: <T>(path: string, body: unknown) => fetchApi<T>(path, { method: 'PUT', json: body }),
  patch: <T>(path: string, body: unknown) => fetchApi<T>(path, { method: 'PATCH', json: body }),
  delete: <T>(path: string) => fetchApi<T>(path, { method: 'DELETE' }),
};
