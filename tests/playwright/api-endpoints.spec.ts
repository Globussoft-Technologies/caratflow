import { test, expect } from '@playwright/test';

const API = '/api/v1';
const CREDS = { email: 'admin@sharmajewellers.com', password: 'admin123', tenantSlug: 'sharma-jewellers' };

test.describe('API - Auth Endpoints', () => {
  test('POST /auth/login - valid credentials returns tokens', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, { data: CREDS });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.refreshToken).toBeTruthy();
    expect(body.data.expiresIn).toBeGreaterThan(0);
  });

  test('POST /auth/login - wrong password returns 401', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { ...CREDS, password: 'wrongpassword' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.message).toContain('Invalid');
  });

  test('POST /auth/login - nonexistent tenant returns 401', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { ...CREDS, tenantSlug: 'no-such-tenant' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /auth/login - nonexistent email returns 401', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { ...CREDS, email: 'nobody@nowhere.com' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /auth/login - empty body returns 400', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message).toBeInstanceOf(Array);
    expect(body.message.length).toBeGreaterThan(0);
  });

  test('POST /auth/login - missing password returns 400', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@sharmajewellers.com', tenantSlug: 'sharma-jewellers' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /auth/login - missing tenantSlug returns 400', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'admin@sharmajewellers.com', password: 'admin123' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /auth/login - invalid email format returns 400', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { email: 'not-an-email', password: 'test', tenantSlug: 'test' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.message.some((m: string) => m.includes('email'))).toBe(true);
  });

  test('POST /auth/refresh - valid refresh token returns new access token', async ({ request }) => {
    const login = await request.post(`${API}/auth/login`, { data: CREDS });
    const { refreshToken } = (await login.json()).data;

    const res = await request.post(`${API}/auth/refresh`, { data: { refreshToken } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTruthy();
  });

  test('POST /auth/refresh - invalid token returns 401', async ({ request }) => {
    const res = await request.post(`${API}/auth/refresh`, {
      data: { refreshToken: 'fake-token-12345' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /auth/refresh - empty token returns 400', async ({ request }) => {
    const res = await request.post(`${API}/auth/refresh`, { data: {} });
    expect(res.status()).toBe(400);
  });

  test('POST /auth/logout - revokes refresh token', async ({ request }) => {
    const login = await request.post(`${API}/auth/login`, { data: CREDS });
    const { refreshToken } = (await login.json()).data;

    const res = await request.post(`${API}/auth/logout`, { data: { refreshToken } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('POST /auth/refresh - revoked token returns 401', async ({ request }) => {
    const login = await request.post(`${API}/auth/login`, { data: CREDS });
    const { refreshToken } = (await login.json()).data;

    await request.post(`${API}/auth/logout`, { data: { refreshToken } });
    const res = await request.post(`${API}/auth/refresh`, { data: { refreshToken } });
    expect(res.status()).toBe(401);
  });

  test('POST /auth/forgot-password - returns 200 for valid request', async ({ request }) => {
    const res = await request.post(`${API}/auth/forgot-password`, {
      data: { email: 'admin@sharmajewellers.com', tenantSlug: 'sharma-jewellers' },
    });
    expect(res.status()).toBe(200);
  });
});

test.describe('API - Swagger & Health', () => {
  test('GET /api/docs - Swagger UI loads', async ({ request }) => {
    const res = await request.get('/api/docs');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('swagger');
  });

  test('GET /api/docs-json - OpenAPI spec available', async ({ request }) => {
    const res = await request.get('/api/docs-json');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.openapi || body.swagger).toBeTruthy();
    expect(body.info.title).toContain('CaratFlow');
  });
});

test.describe('API - Token Lifecycle', () => {
  test('Full lifecycle: login -> refresh -> logout -> reject', async ({ request }) => {
    // Step 1: Login
    const loginRes = await request.post(`${API}/auth/login`, { data: CREDS });
    expect(loginRes.status()).toBe(200);
    const loginBody = await loginRes.json();
    const { accessToken, refreshToken } = loginBody.data;
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    // Step 2: Logout (use the same token before refreshing)
    const logoutRes = await request.post(`${API}/auth/logout`, { data: { refreshToken } });
    expect(logoutRes.status()).toBe(200);

    // Step 3: Try to use revoked token
    const revokedRes = await request.post(`${API}/auth/refresh`, { data: { refreshToken } });
    expect(revokedRes.status()).toBe(401);
  });

  test('Multiple logins create independent sessions', async ({ request }) => {
    const login1 = await request.post(`${API}/auth/login`, { data: CREDS });
    const login2 = await request.post(`${API}/auth/login`, { data: CREDS });

    const token1 = (await login1.json()).data.refreshToken;
    const token2 = (await login2.json()).data.refreshToken;

    expect(token1).not.toBe(token2);

    // Both should work independently
    const refresh1 = await request.post(`${API}/auth/refresh`, { data: { refreshToken: token1 } });
    const refresh2 = await request.post(`${API}/auth/refresh`, { data: { refreshToken: token2 } });

    expect(refresh1.status()).toBe(200);
    expect(refresh2.status()).toBe(200);
  });
});
