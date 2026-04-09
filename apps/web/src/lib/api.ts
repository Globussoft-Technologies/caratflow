const API_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000');

async function fetchApi<T>(path: string, options: RequestInit & { data?: unknown } = {}): Promise<T> {
  const { data, headers: customHeaders, ...rest } = options;
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    headers,
    body: data ? JSON.stringify(data) : undefined,
    ...rest,
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? json.error ?? 'Request failed');
  }

  return json;
}

export const api = {
  get: <T>(path: string) => fetchApi<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) => fetchApi<T>(path, { method: 'POST', data: body }),
  put: <T>(path: string, body: unknown) => fetchApi<T>(path, { method: 'PUT', data: body }),
  patch: <T>(path: string, body: unknown) => fetchApi<T>(path, { method: 'PATCH', data: body }),
  delete: <T>(path: string) => fetchApi<T>(path, { method: 'DELETE' }),
};
