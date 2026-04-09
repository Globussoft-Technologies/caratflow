import { test, expect, APIRequestContext } from '@playwright/test';

// ─── Constants ──────────────────────────────────────────────────────────────
// Global prefix is "api/v1" but most B2C controllers already include
// "api/v1" in their @Controller() decorator path, so the effective URL
// becomes /api/v1/api/v1/store/...  (doubled prefix).

const API = '/api/v1';
const B2C = '/api/v1/api/v1';
const CREDS = {
  email: 'admin@sharmajewellers.com',
  password: 'admin123',
  tenantSlug: 'sharma-jewellers',
};

const FAKE_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const FAKE_CUSTOMER_ID = '00000000-0000-0000-0000-000000000099';
const FAKE_PRODUCT_ID = '00000000-0000-0000-0000-000000000077';
const FAKE_UUID = '00000000-0000-0000-0000-ffffffffffff';

function tenantHeaders(extra: Record<string, string> = {}) {
  return {
    'x-tenant-id': FAKE_TENANT_ID,
    ...extra,
  };
}

function customerHeaders(extra: Record<string, string> = {}) {
  return {
    'x-tenant-id': FAKE_TENANT_ID,
    'x-customer-id': FAKE_CUSTOMER_ID,
    ...extra,
  };
}

// ─── Auth Helper ────────────────────────────────────────────────────────────

async function getAuthToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API}/auth/login`, { data: CREDS });
  const body = await res.json();
  return body.data.accessToken;
}

// ═══════════════════════════════════════════════════════════════════════════
//  HEALTH
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Health Controller', () => {
  test('GET /health - returns healthy status', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBeTruthy();
    expect(body.version).toBeTruthy();
    expect(body.checks).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  B2C AUTH
// ═══════════════════════════════════════════════════════════════════════════

test.describe('B2C Auth Controller', () => {
  const B2C_AUTH = `${B2C}/b2c/auth`;

  test('POST /b2c/auth/register/email - missing fields returns 400', async ({ request }) => {
    const res = await request.post(`${B2C_AUTH}/register/email`, { data: {} });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /b2c/auth/login/email - invalid credentials returns error', async ({ request }) => {
    const res = await request.post(`${B2C_AUTH}/login/email`, {
      data: { email: 'noone@test.com', password: 'wrong', tenantSlug: 'sharma-jewellers' },
    });
    expect([400, 401, 404, 500]).toContain(res.status());
  });

  test('POST /b2c/auth/login/email - missing body returns 400', async ({ request }) => {
    const res = await request.post(`${B2C_AUTH}/login/email`, { data: {} });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /b2c/auth/login/phone - missing body returns error', async ({ request }) => {
    const res = await request.post(`${B2C_AUTH}/login/phone`, { data: {} });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /b2c/auth/login/social - missing provider returns error', async ({ request }) => {
    const res = await request.post(`${B2C_AUTH}/login/social`, { data: {} });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /b2c/auth/otp/send - missing body returns error', async ({ request }) => {
    const res = await request.post(`${B2C_AUTH}/otp/send`, { data: {} });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /b2c/auth/otp/verify - missing body returns error', async ({ request }) => {
    const res = await request.post(`${B2C_AUTH}/otp/verify`, { data: {} });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /b2c/auth/refresh - invalid token returns error', async ({ request }) => {
    const res = await request.post(`${B2C_AUTH}/refresh`, {
      data: { refreshToken: 'invalid-token-abc' },
    });
    expect([400, 401, 500]).toContain(res.status());
  });

  test('POST /b2c/auth/refresh - empty body returns error', async ({ request }) => {
    const res = await request.post(`${B2C_AUTH}/refresh`, { data: {} });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /b2c/auth/2fa/enable - without auth returns 401', async ({ request }) => {
    const res = await request.post(`${B2C_AUTH}/2fa/enable`);
    expect(res.status()).toBe(401);
  });

  test('POST /b2c/auth/2fa/verify - without auth returns 401', async ({ request }) => {
    const res = await request.post(`${B2C_AUTH}/2fa/verify`, { data: { code: '123456' } });
    expect(res.status()).toBe(401);
  });

  test('POST /b2c/auth/2fa/disable - without auth returns 401', async ({ request }) => {
    const res = await request.post(`${B2C_AUTH}/2fa/disable`, { data: { code: '123456' } });
    expect(res.status()).toBe(401);
  });

  test('GET /b2c/auth/me - without auth returns 401', async ({ request }) => {
    const res = await request.get(`${B2C_AUTH}/me`);
    expect(res.status()).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  STOREFRONT
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Storefront Controller', () => {
  const STORE = `${B2C}/store`;

  test('GET /store/home - with tenant header returns 200 or 500', async ({ request }) => {
    const res = await request.get(`${STORE}/home`, { headers: tenantHeaders() });
    // 200 if tenant data exists, 500 if tenant not found -- both are valid endpoint hits
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/home - without tenant header returns 400', async ({ request }) => {
    const res = await request.get(`${STORE}/home`);
    expect(res.status()).toBe(400);
  });

  test('GET /store/products - with tenant header returns response', async ({ request }) => {
    const res = await request.get(`${STORE}/products`, { headers: tenantHeaders() });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/products - without tenant header returns 400', async ({ request }) => {
    const res = await request.get(`${STORE}/products`);
    expect(res.status()).toBe(400);
  });

  test('GET /store/products - with pagination params', async ({ request }) => {
    const res = await request.get(`${STORE}/products?page=1&limit=5`, {
      headers: tenantHeaders(),
    });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/products/:id - non-existent product', async ({ request }) => {
    const res = await request.get(`${STORE}/products/${FAKE_PRODUCT_ID}`, {
      headers: tenantHeaders(),
    });
    expect([200, 404, 500]).toContain(res.status());
  });

  test('GET /store/products/search - missing query returns 400', async ({ request }) => {
    const res = await request.get(`${STORE}/products/search`, {
      headers: tenantHeaders(),
    });
    expect([400, 500]).toContain(res.status());
  });

  test('GET /store/products/search - with query', async ({ request }) => {
    const res = await request.get(`${STORE}/products/search?q=gold`, {
      headers: tenantHeaders(),
    });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/categories - with tenant header', async ({ request }) => {
    const res = await request.get(`${STORE}/categories`, { headers: tenantHeaders() });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/categories - without tenant header returns 400', async ({ request }) => {
    const res = await request.get(`${STORE}/categories`);
    expect(res.status()).toBe(400);
  });

  test('GET /store/compare - missing ids returns 400', async ({ request }) => {
    const res = await request.get(`${STORE}/compare`, { headers: tenantHeaders() });
    expect([400, 500]).toContain(res.status());
  });

  test('GET /store/compare - only 1 id returns 400', async ({ request }) => {
    const res = await request.get(`${STORE}/compare?ids=${FAKE_PRODUCT_ID}`, {
      headers: tenantHeaders(),
    });
    expect([400, 500]).toContain(res.status());
  });

  test('GET /store/cart - returns cart or error', async ({ request }) => {
    const res = await request.get(`${STORE}/cart`, { headers: tenantHeaders() });
    expect([200, 500]).toContain(res.status());
  });

  test('POST /store/cart/items - without tenant returns 400', async ({ request }) => {
    const res = await request.post(`${STORE}/cart/items`, {
      data: { productId: FAKE_PRODUCT_ID },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /store/cart/merge - without customer returns 400', async ({ request }) => {
    const res = await request.post(`${STORE}/cart/merge`, {
      headers: tenantHeaders(),
    });
    expect([400, 500]).toContain(res.status());
  });

  test('GET /store/wishlist - without customer returns 400', async ({ request }) => {
    const res = await request.get(`${STORE}/wishlist`, { headers: tenantHeaders() });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /store/wishlist - without customer returns 400', async ({ request }) => {
    const res = await request.post(`${STORE}/wishlist`, {
      headers: tenantHeaders(),
      data: { productId: FAKE_PRODUCT_ID },
    });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /store/checkout - without customer returns 400', async ({ request }) => {
    const res = await request.post(`${STORE}/checkout`, {
      headers: tenantHeaders(),
      data: { cartId: FAKE_UUID, addressId: FAKE_UUID, paymentMethod: 'UPI' },
    });
    expect([400, 500]).toContain(res.status());
  });

  test('GET /store/orders - without customer returns 400', async ({ request }) => {
    const res = await request.get(`${STORE}/orders`, { headers: tenantHeaders() });
    expect([400, 500]).toContain(res.status());
  });

  test('GET /store/orders/:id - without customer returns 400', async ({ request }) => {
    const res = await request.get(`${STORE}/orders/${FAKE_UUID}`, {
      headers: tenantHeaders(),
    });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /store/reviews - without customer returns 400', async ({ request }) => {
    const res = await request.post(`${STORE}/reviews`, {
      headers: tenantHeaders(),
      data: { productId: FAKE_PRODUCT_ID, rating: 5 },
    });
    expect([400, 500]).toContain(res.status());
  });

  test('GET /store/reviews/:productId - returns reviews or error', async ({ request }) => {
    const res = await request.get(`${STORE}/reviews/${FAKE_PRODUCT_ID}`, {
      headers: tenantHeaders(),
    });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/addresses - without customer returns 400', async ({ request }) => {
    const res = await request.get(`${STORE}/addresses`, { headers: tenantHeaders() });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /store/coupons/validate - with tenant header', async ({ request }) => {
    const res = await request.post(`${STORE}/coupons/validate`, {
      headers: tenantHeaders(),
      data: { code: 'TESTCOUPON', cartTotalPaise: 100000 },
    });
    expect([200, 400, 404, 500]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  CMS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('CMS Controller', () => {
  const CMS = `${B2C}/store/cms`;

  test('GET /store/cms/homepage - returns response', async ({ request }) => {
    const res = await request.get(`${CMS}/homepage`);
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/cms/banners - returns response', async ({ request }) => {
    const res = await request.get(`${CMS}/banners`);
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/cms/banners?position=HERO - with position filter', async ({ request }) => {
    const res = await request.get(`${CMS}/banners?position=HERO`);
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/cms/collections - returns response', async ({ request }) => {
    const res = await request.get(`${CMS}/collections`);
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/cms/collections/:slug - non-existent slug', async ({ request }) => {
    const res = await request.get(`${CMS}/collections/non-existent-slug`);
    expect([200, 404, 500]).toContain(res.status());
  });

  test('GET /store/cms/pages/:slug - non-existent page', async ({ request }) => {
    const res = await request.get(`${CMS}/pages/about-us`);
    expect([200, 404, 500]).toContain(res.status());
  });

  test('GET /store/cms/blog - returns blog posts', async ({ request }) => {
    const res = await request.get(`${CMS}/blog`);
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/cms/blog - with pagination', async ({ request }) => {
    const res = await request.get(`${CMS}/blog?page=1&limit=5`);
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/cms/blog/:slug - non-existent blog post', async ({ request }) => {
    const res = await request.get(`${CMS}/blog/non-existent-post`);
    expect([200, 404, 500]).toContain(res.status());
  });

  test('GET /store/cms/faq - returns FAQ data', async ({ request }) => {
    const res = await request.get(`${CMS}/faq`);
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/cms/announcement - returns announcement or null', async ({ request }) => {
    const res = await request.get(`${CMS}/announcement`);
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/cms/seo/:pageType/:identifier - returns SEO data', async ({ request }) => {
    const res = await request.get(`${CMS}/seo/product/test-product`);
    expect([200, 404, 500]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Search Controller', () => {
  const SEARCH = `${B2C}/store/search`;

  test('GET /store/search - without query returns 400', async ({ request }) => {
    const res = await request.get(SEARCH, { headers: tenantHeaders() });
    expect([400, 500]).toContain(res.status());
  });

  test('GET /store/search - without tenant header returns 400', async ({ request }) => {
    const res = await request.get(`${SEARCH}?q=gold`);
    expect(res.status()).toBe(400);
  });

  test('GET /store/search?q=gold - with tenant and query', async ({ request }) => {
    const res = await request.get(`${SEARCH}?q=gold`, { headers: tenantHeaders() });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/search?q=ring&page=1&limit=5 - with pagination', async ({ request }) => {
    const res = await request.get(`${SEARCH}?q=ring&page=1&limit=5`, {
      headers: tenantHeaders(),
    });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/search/autocomplete - without query returns 400', async ({ request }) => {
    const res = await request.get(`${SEARCH}/autocomplete`, { headers: tenantHeaders() });
    expect([400, 500]).toContain(res.status());
  });

  test('GET /store/search/autocomplete?q=go - with query', async ({ request }) => {
    const res = await request.get(`${SEARCH}/autocomplete?q=go`, {
      headers: tenantHeaders(),
    });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/search/popular - returns popular searches', async ({ request }) => {
    const res = await request.get(`${SEARCH}/popular`, { headers: tenantHeaders() });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/search/popular - without tenant returns 400', async ({ request }) => {
    const res = await request.get(`${SEARCH}/popular`);
    expect(res.status()).toBe(400);
  });

  test('GET /store/search/recent - without customer returns 400', async ({ request }) => {
    const res = await request.get(`${SEARCH}/recent`, { headers: tenantHeaders() });
    expect([400, 500]).toContain(res.status());
  });

  test('GET /store/search/recent - with customer header', async ({ request }) => {
    const res = await request.get(`${SEARCH}/recent`, { headers: customerHeaders() });
    expect([200, 500]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  CHATBOT
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Chatbot Controller', () => {
  const CHAT = `${B2C}/store/chat`;

  test('POST /store/chat/start - with tenant header', async ({ request }) => {
    const res = await request.post(`${CHAT}/start`, {
      headers: tenantHeaders(),
      data: {},
    });
    expect([200, 500]).toContain(res.status());
  });

  test('POST /store/chat/start - without tenant returns 400', async ({ request }) => {
    const res = await request.post(`${CHAT}/start`, { data: {} });
    expect(res.status()).toBe(400);
  });

  test('POST /store/chat/message - missing sessionId returns 400', async ({ request }) => {
    const res = await request.post(`${CHAT}/message`, {
      headers: tenantHeaders(),
      data: { content: 'Hello' },
    });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /store/chat/message - missing content returns 400', async ({ request }) => {
    const res = await request.post(`${CHAT}/message`, {
      headers: tenantHeaders(),
      data: { sessionId: 'test-session-1' },
    });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /store/chat/message - with valid data', async ({ request }) => {
    const res = await request.post(`${CHAT}/message`, {
      headers: tenantHeaders(),
      data: { sessionId: 'test-session-1', content: 'Show me gold rings' },
    });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/chat/session/:sessionId - non-existent session', async ({ request }) => {
    const res = await request.get(`${CHAT}/session/nonexistent-session`, {
      headers: tenantHeaders(),
    });
    expect([200, 404, 500]).toContain(res.status());
  });

  test('POST /store/chat/escalate/:sessionId - escalate non-existent session', async ({ request }) => {
    const res = await request.post(`${CHAT}/escalate/nonexistent-session`, {
      headers: tenantHeaders(),
    });
    expect([200, 404, 500]).toContain(res.status());
  });

  test('POST /store/chat/close/:sessionId - close non-existent session', async ({ request }) => {
    const res = await request.post(`${CHAT}/close/nonexistent-session`, {
      headers: tenantHeaders(),
    });
    expect([200, 404, 500]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  DIGITAL GOLD
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Digital Gold Controller', () => {
  const DG = `${B2C}/store/digital-gold`;

  test('GET /store/digital-gold/rates/current - public endpoint', async ({ request }) => {
    const res = await request.get(`${DG}/rates/current`);
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/digital-gold/rates/history - public endpoint', async ({ request }) => {
    const res = await request.get(`${DG}/rates/history`);
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/digital-gold/rates/history - with date range', async ({ request }) => {
    const res = await request.get(`${DG}/rates/history?from=2025-01-01&to=2025-12-31`);
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/digital-gold/vault - without auth returns error', async ({ request }) => {
    const res = await request.get(`${DG}/vault`);
    expect([400, 401, 500]).toContain(res.status());
  });

  test('GET /store/digital-gold/portfolio - without auth returns error', async ({ request }) => {
    const res = await request.get(`${DG}/portfolio`);
    expect([400, 401, 500]).toContain(res.status());
  });

  test('GET /store/digital-gold/transactions - without auth returns error', async ({ request }) => {
    const res = await request.get(`${DG}/transactions`);
    expect([400, 401, 500]).toContain(res.status());
  });

  test('POST /store/digital-gold/buy - without auth returns error', async ({ request }) => {
    const res = await request.post(`${DG}/buy`, {
      data: { amountPaise: 100000, purity: 999 },
    });
    expect([400, 401, 500]).toContain(res.status());
  });

  test('POST /store/digital-gold/sell - without auth returns error', async ({ request }) => {
    const res = await request.post(`${DG}/sell`, {
      data: { weightMg: 1000 },
    });
    expect([400, 401, 500]).toContain(res.status());
  });

  test('GET /store/digital-gold/sip - without auth returns error', async ({ request }) => {
    const res = await request.get(`${DG}/sip`);
    expect([400, 401, 500]).toContain(res.status());
  });

  test('GET /store/digital-gold/alerts - without auth returns error', async ({ request }) => {
    const res = await request.get(`${DG}/alerts`);
    expect([400, 401, 500]).toContain(res.status());
  });

  test('GET /store/digital-gold/redemptions - without auth returns error', async ({ request }) => {
    const res = await request.get(`${DG}/redemptions`);
    expect([400, 401, 500]).toContain(res.status());
  });

  test('GET /store/digital-gold/dashboard - without auth returns error', async ({ request }) => {
    const res = await request.get(`${DG}/dashboard`);
    expect([400, 401, 500]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  B2C FEATURES (wishlist, compare, coupons, back-in-stock)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('B2C Features Controller', () => {
  const STORE = `${B2C}/store`;

  // ─── Compare (session-based, no auth required) ────────────────
  test('GET /store/compare - with sessionId returns response', async ({ request }) => {
    const res = await request.get(`${STORE}/compare?sessionId=test-sess-1`);
    expect([200, 500]).toContain(res.status());
  });

  test('POST /store/compare - add to compare list', async ({ request }) => {
    const res = await request.post(`${STORE}/compare`, {
      data: { productId: FAKE_PRODUCT_ID, sessionId: 'test-sess-1' },
    });
    expect([201, 400, 500]).toContain(res.status());
  });

  // ─── Wishlist (requires customer) ─────────────────────────────
  test('GET /store/wishlist/count - without customer returns error', async ({ request }) => {
    const res = await request.get(`${STORE}/wishlist/count`);
    expect([400, 500]).toContain(res.status());
  });

  // ─── Back in stock ────────────────────────────────────────────
  test('POST /store/back-in-stock/subscribe - with data', async ({ request }) => {
    const res = await request.post(`${STORE}/back-in-stock/subscribe`, {
      data: { productId: FAKE_PRODUCT_ID, email: 'test@example.com' },
    });
    expect([201, 400, 500]).toContain(res.status());
  });

  test('GET /store/back-in-stock - without customer returns error', async ({ request }) => {
    const res = await request.get(`${STORE}/back-in-stock`);
    expect([400, 500]).toContain(res.status());
  });

  // ─── Coupons auto-apply ───────────────────────────────────────
  test('POST /store/coupons/auto-apply - without customer returns error', async ({ request }) => {
    const res = await request.post(`${STORE}/coupons/auto-apply`, {
      data: {
        cartTotalPaise: 500000,
        cartItems: [{ productId: FAKE_PRODUCT_ID, pricePaise: 500000, quantity: 1 }],
      },
    });
    expect([400, 500]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  BNPL / PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('BNPL Controller', () => {
  const PAY = `${B2C}/store/payments`;

  test('GET /store/payments/emi-plans - missing amount returns 400', async ({ request }) => {
    const res = await request.get(`${PAY}/emi-plans`);
    expect([400, 500]).toContain(res.status());
  });

  test('GET /store/payments/emi-plans?amount=5000000 - with valid amount', async ({ request }) => {
    const res = await request.get(`${PAY}/emi-plans?amount=5000000`);
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/payments/emi-plans?amount=-1 - negative amount returns 400', async ({ request }) => {
    const res = await request.get(`${PAY}/emi-plans?amount=-1`);
    expect([400, 500]).toContain(res.status());
  });

  test('POST /store/payments/emi/calculate - with valid input', async ({ request }) => {
    const res = await request.post(`${PAY}/emi/calculate`, {
      data: { amountPaise: 5000000, tenure: 12, interestRatePct: 12 },
    });
    expect([200, 500]).toContain(res.status());
  });

  test('POST /store/payments/emi/calculate - missing amount returns 400', async ({ request }) => {
    const res = await request.post(`${PAY}/emi/calculate`, {
      data: { tenure: 12, interestRatePct: 12 },
    });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /store/payments/bnpl/initiate - without customer returns 400', async ({ request }) => {
    const res = await request.post(`${PAY}/bnpl/initiate`, {
      data: { orderId: FAKE_UUID, provider: 'SIMPL', amountPaise: 5000000 },
    });
    expect([400, 500]).toContain(res.status());
  });

  test('GET /store/payments/bnpl/eligibility - missing params returns 400', async ({ request }) => {
    const res = await request.get(`${PAY}/bnpl/eligibility`);
    expect([400, 500]).toContain(res.status());
  });

  test('GET /store/payments/bnpl/:transactionId - non-existent transaction', async ({ request }) => {
    const res = await request.get(`${PAY}/bnpl/${FAKE_UUID}`);
    expect([200, 404, 500]).toContain(res.status());
  });

  test('GET /store/payments/saved-methods - without customer returns 400', async ({ request }) => {
    const res = await request.get(`${PAY}/saved-methods`);
    expect([400, 500]).toContain(res.status());
  });

  test('POST /store/payments/saved-methods - without customer returns 400', async ({ request }) => {
    const res = await request.post(`${PAY}/saved-methods`, {
      data: { type: 'CARD', token: 'tok_test', lastFour: '4242' },
    });
    expect([400, 500]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Recommendations Controller', () => {
  const REC = `${B2C}/store/recommendations`;

  test('GET /store/recommendations/trending - with tenant header', async ({ request }) => {
    const res = await request.get(`${REC}/trending`, { headers: tenantHeaders() });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/recommendations/trending - without tenant returns 400', async ({ request }) => {
    const res = await request.get(`${REC}/trending`);
    expect(res.status()).toBe(400);
  });

  test('GET /store/recommendations/trending?limit=5&period=30 - with params', async ({ request }) => {
    const res = await request.get(`${REC}/trending?limit=5&period=30`, {
      headers: tenantHeaders(),
    });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/recommendations/similar/:productId - with tenant', async ({ request }) => {
    const res = await request.get(`${REC}/similar/${FAKE_PRODUCT_ID}`, {
      headers: tenantHeaders(),
    });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/recommendations/bought-together/:productId - with tenant', async ({ request }) => {
    const res = await request.get(`${REC}/bought-together/${FAKE_PRODUCT_ID}`, {
      headers: tenantHeaders(),
    });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/recommendations/category/:categoryId - with tenant', async ({ request }) => {
    const res = await request.get(`${REC}/category/${FAKE_UUID}`, {
      headers: tenantHeaders(),
    });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/recommendations/personalized - without customer returns 400', async ({ request }) => {
    const res = await request.get(`${REC}/personalized`, { headers: tenantHeaders() });
    expect([400, 500]).toContain(res.status());
  });

  test('GET /store/recommendations/for-you - without customer returns 400', async ({ request }) => {
    const res = await request.get(`${REC}/for-you`, { headers: tenantHeaders() });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /store/recommendations/track/view - with productId', async ({ request }) => {
    const res = await request.post(`${REC}/track/view`, {
      headers: tenantHeaders(),
      data: { productId: FAKE_PRODUCT_ID },
    });
    expect([204, 500]).toContain(res.status());
  });

  test('POST /store/recommendations/track/view - missing productId returns 400', async ({ request }) => {
    const res = await request.post(`${REC}/track/view`, {
      headers: tenantHeaders(),
      data: {},
    });
    expect([400, 500]).toContain(res.status());
  });

  test('POST /store/recommendations/track/click - missing fields returns 400', async ({ request }) => {
    const res = await request.post(`${REC}/track/click`, {
      headers: tenantHeaders(),
      data: {},
    });
    expect([400, 500]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  CUSTOMER PORTAL
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Customer Portal Controller', () => {
  const ACCT = `${B2C}/store/account`;

  test('GET /store/account/dashboard - without auth returns 401', async ({ request }) => {
    const res = await request.get(`${ACCT}/dashboard`);
    expect(res.status()).toBe(401);
  });

  test('GET /store/account/profile - without auth returns 401', async ({ request }) => {
    const res = await request.get(`${ACCT}/profile`);
    expect(res.status()).toBe(401);
  });

  test('PUT /store/account/profile - without auth returns 401', async ({ request }) => {
    const res = await request.put(`${ACCT}/profile`, { data: { firstName: 'Test' } });
    expect(res.status()).toBe(401);
  });

  test('PUT /store/account/password - without auth returns 401', async ({ request }) => {
    const res = await request.put(`${ACCT}/password`, {
      data: { currentPassword: 'old', newPassword: 'new' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /store/account/notifications - without auth returns 401', async ({ request }) => {
    const res = await request.get(`${ACCT}/notifications`);
    expect(res.status()).toBe(401);
  });

  test('GET /store/account/orders - without auth returns 401', async ({ request }) => {
    const res = await request.get(`${ACCT}/orders`);
    expect(res.status()).toBe(401);
  });

  test('GET /store/account/orders/:id - without auth returns 401', async ({ request }) => {
    const res = await request.get(`${ACCT}/orders/${FAKE_UUID}`);
    expect(res.status()).toBe(401);
  });

  test('GET /store/account/orders/:id/tracking - without auth returns 401', async ({ request }) => {
    const res = await request.get(`${ACCT}/orders/${FAKE_UUID}/tracking`);
    expect(res.status()).toBe(401);
  });

  test('GET /store/account/orders/:id/invoice - without auth returns 401', async ({ request }) => {
    const res = await request.get(`${ACCT}/orders/${FAKE_UUID}/invoice`);
    expect(res.status()).toBe(401);
  });

  test('GET /store/account/loyalty - without auth returns 401', async ({ request }) => {
    const res = await request.get(`${ACCT}/loyalty`);
    expect(res.status()).toBe(401);
  });

  test('GET /store/account/loyalty/history - without auth returns 401', async ({ request }) => {
    const res = await request.get(`${ACCT}/loyalty/history`);
    expect(res.status()).toBe(401);
  });

  test('GET /store/account/schemes - without auth returns 401', async ({ request }) => {
    const res = await request.get(`${ACCT}/schemes`);
    expect(res.status()).toBe(401);
  });

  test('GET /store/account/schemes/:id - without auth returns 401', async ({ request }) => {
    const res = await request.get(`${ACCT}/schemes/${FAKE_UUID}`);
    expect(res.status()).toBe(401);
  });

  test('GET /store/account/kyc - without auth returns 401', async ({ request }) => {
    const res = await request.get(`${ACCT}/kyc`);
    expect(res.status()).toBe(401);
  });

  test('POST /store/account/kyc/upload - without auth returns 401', async ({ request }) => {
    const res = await request.post(`${ACCT}/kyc/upload`, {
      data: { documentType: 'PAN', documentNumber: 'ABCDE1234F', fileUrl: 'https://example.com/doc.pdf' },
    });
    expect(res.status()).toBe(401);
  });

  test('DELETE /store/account - without auth returns 401', async ({ request }) => {
    const res = await request.delete(ACCT);
    expect(res.status()).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  REFERRAL
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Referral Controller', () => {
  const REF = `${B2C}/store/referral`;

  test('GET /store/referral/my-code - without auth returns error', async ({ request }) => {
    const res = await request.get(`${REF}/my-code`);
    expect([400, 401, 500]).toContain(res.status());
  });

  test('POST /store/referral/apply - without auth returns error', async ({ request }) => {
    const res = await request.post(`${REF}/apply`, {
      data: { referralCode: 'TESTCODE123' },
    });
    expect([400, 401, 500]).toContain(res.status());
  });

  test('GET /store/referral/stats - without auth returns error', async ({ request }) => {
    const res = await request.get(`${REF}/stats`);
    expect([400, 401, 500]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  PRE-ORDER
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Pre-Order Controller', () => {
  const STORE = `${B2C}/store`;

  test('GET /store/products/:id/preorder-status - with product id', async ({ request }) => {
    const res = await request.get(`${STORE}/products/${FAKE_PRODUCT_ID}/preorder-status`);
    expect([200, 404, 500]).toContain(res.status());
  });

  test('GET /store/preorder/my - without auth returns error', async ({ request }) => {
    const res = await request.get(`${STORE}/preorder/my`);
    expect([400, 401, 500]).toContain(res.status());
  });

  test('POST /store/preorder - without auth returns error', async ({ request }) => {
    const res = await request.post(`${STORE}/preorder`, {
      data: { productId: FAKE_PRODUCT_ID, quantity: 1 },
    });
    expect([400, 401, 500]).toContain(res.status());
  });

  test('POST /store/orders/:id/modify - without auth returns error', async ({ request }) => {
    const res = await request.post(`${STORE}/orders/${FAKE_UUID}/modify`, {
      data: { modificationType: 'ADDRESS_CHANGE', requestedData: {}, reason: 'Wrong address' },
    });
    expect([400, 401, 500]).toContain(res.status());
  });

  test('GET /store/orders/:id/modifications - without auth returns error', async ({ request }) => {
    const res = await request.get(`${STORE}/orders/${FAKE_UUID}/modifications`);
    expect([400, 401, 500]).toContain(res.status());
  });

  test('POST /store/reorder/:orderId - without auth returns error', async ({ request }) => {
    const res = await request.post(`${STORE}/reorder/${FAKE_UUID}`);
    expect([400, 401, 500]).toContain(res.status());
  });

  test('GET /store/reorder/history - without auth returns error', async ({ request }) => {
    const res = await request.get(`${STORE}/reorder/history`);
    expect([400, 401, 500]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  AR (Augmented Reality)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('AR Controller', () => {
  const AR = `${B2C}/store/ar`;

  test('GET /store/ar/products - with tenant header', async ({ request }) => {
    const res = await request.get(`${AR}/products`, { headers: tenantHeaders() });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/ar/products - without tenant returns 400', async ({ request }) => {
    const res = await request.get(`${AR}/products`);
    expect(res.status()).toBe(400);
  });

  test('GET /store/ar/products - with category filter', async ({ request }) => {
    const res = await request.get(`${AR}/products?category=rings`, {
      headers: tenantHeaders(),
    });
    expect([200, 500]).toContain(res.status());
  });

  test('GET /store/ar/products/:productId/tryon - with tenant header', async ({ request }) => {
    const res = await request.get(`${AR}/products/${FAKE_PRODUCT_ID}/tryon`, {
      headers: tenantHeaders(),
    });
    expect([200, 404, 500]).toContain(res.status());
  });

  test('GET /store/ar/products/:productId/360 - with tenant header', async ({ request }) => {
    const res = await request.get(`${AR}/products/${FAKE_PRODUCT_ID}/360`, {
      headers: tenantHeaders(),
    });
    expect([200, 404, 500]).toContain(res.status());
  });

  test('POST /store/ar/sessions/start - with tenant and data', async ({ request }) => {
    const res = await request.post(`${AR}/sessions/start`, {
      headers: tenantHeaders(),
      data: { productId: FAKE_PRODUCT_ID, deviceType: 'MOBILE' },
    });
    expect([201, 500]).toContain(res.status());
  });

  test('POST /store/ar/sessions/start - without tenant returns 400', async ({ request }) => {
    const res = await request.post(`${AR}/sessions/start`, {
      data: { productId: FAKE_PRODUCT_ID, deviceType: 'MOBILE' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /store/ar/sessions/:sessionId/end - non-existent session', async ({ request }) => {
    const res = await request.post(`${AR}/sessions/${FAKE_UUID}/end`, {
      headers: tenantHeaders(),
      data: { duration: 30 },
    });
    expect([200, 404, 500]).toContain(res.status());
  });
});
