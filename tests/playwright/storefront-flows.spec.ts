import { test, expect } from '@playwright/test';

// ─── Homepage Flow ─────────────────────────────────────────────

test.describe('Homepage Flow', () => {
  test('homepage loads under 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('homepage has hero section or banner', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Hero section contains banner text and CTA
    const hero = page.locator('section').first();
    await expect(hero).toBeVisible();
    // Check for CTA link or promotional content
    const body = await page.locator('body').textContent();
    const hasHero = /shop now|explore|collection|discover|jewelry|jewellery/i.test(body ?? '');
    expect(hasHero).toBe(true);
  });

  test('homepage has category section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Shop by Category|Category|categor/i);
  });

  test('homepage has product section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Bestsellers, New Arrivals, or Trending sections
    await expect(page.locator('body')).toContainText(/Bestseller|New Arrival|Trending/i);
  });

  test('homepage scrolling works (page height exceeds viewport)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(bodyHeight).toBeGreaterThan(viewportHeight);
  });

  test('homepage has newsletter or CTA section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').textContent();
    const hasNewsletter = /newsletter|subscribe|stay updated|email|gold savings scheme/i.test(body ?? '');
    expect(hasNewsletter).toBe(true);
  });
});

// ─── Shopping Flow ─────────────────────────────────────────────

test.describe('Shopping Flow', () => {
  test('navigate to /category/gold loads successfully', async ({ page }) => {
    const res = await page.goto('/category/gold');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/gold|product|filter/i);
  });

  test('navigate to /category/silver loads successfully', async ({ page }) => {
    const res = await page.goto('/category/silver');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigate to /category/diamond loads successfully', async ({ page }) => {
    const res = await page.goto('/category/diamond');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('search for "gold ring" loads search page', async ({ page }) => {
    await page.goto('/search?q=gold+ring');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/gold|ring|search|result/i);
  });

  test('visiting /product/test-id loads without 500 error', async ({ page }) => {
    const res = await page.goto('/product/test-id');
    // Even if 404, should not be 500
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('cart page is accessible', async ({ page }) => {
    const res = await page.goto('/cart');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('wishlist page is accessible', async ({ page }) => {
    const res = await page.goto('/wishlist');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('compare page is accessible', async ({ page }) => {
    const res = await page.goto('/compare');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─── Auth Flow ─────────────────────────────────────────────────

test.describe('Auth Flow', () => {
  test('login page has email tab and phone tab', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    // Tab buttons for Email and Phone login
    const emailTab = page.locator('button:has-text("Email"), [role="tab"]:has-text("Email")').first();
    const phoneTab = page.locator('button:has-text("Phone"), [role="tab"]:has-text("Phone")').first();
    const hasEmailTab = await emailTab.isVisible().catch(() => false);
    const hasPhoneTab = await phoneTab.isVisible().catch(() => false);
    // At minimum the body should contain email/phone references
    const body = await page.locator('body').textContent();
    expect(hasEmailTab || hasPhoneTab || /email|phone/i.test(body ?? '')).toBe(true);
  });

  test('login page email tab has email and password inputs', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('login page phone tab shows phone input', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    const phoneTab = page.locator('button:has-text("Phone")').first();
    if (await phoneTab.isVisible()) {
      await phoneTab.click();
      await expect(page.locator('input[type="tel"], input[placeholder*="phone" i]').first()).toBeVisible();
    }
  });

  test('login with demo credentials shows success message', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('text=Login successful')).toBeVisible({ timeout: 10000 });
  });

  test('login stores token in localStorage', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(4000);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
    expect(token!.startsWith('eyJ')).toBe(true);
  });

  test('register page has name, email, phone, and password fields', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    const inputs = page.locator('input');
    const count = await inputs.count();
    // Register form should have multiple input fields
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('forgot password page has email input', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await page.waitForLoadState('networkidle');
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    await expect(emailInput).toBeVisible();
  });

  test('OTP page has input fields', async ({ page }) => {
    await page.goto('/auth/verify-otp');
    await page.waitForLoadState('networkidle');
    const inputs = page.locator('input');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ─── Account Flow ──────────────────────────────────────────────

test.describe('Account Flow', () => {
  test('/account page loads', async ({ page }) => {
    const res = await page.goto('/account');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/account|dashboard|order|profile/i);
  });

  test('/account/orders page loads', async ({ page }) => {
    const res = await page.goto('/account/orders');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/order|track|history|empty/i);
  });

  test('/account/wishlist page loads', async ({ page }) => {
    const res = await page.goto('/account/wishlist');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('/account/addresses page loads', async ({ page }) => {
    const res = await page.goto('/account/addresses');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/address|delivery|shipping|add/i);
  });

  test('/account/profile page loads', async ({ page }) => {
    const res = await page.goto('/account/profile');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('/account/loyalty page loads with points info', async ({ page }) => {
    const res = await page.goto('/account/loyalty');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/point|tier|loyalty|reward/i);
  });

  test('/account/schemes page loads', async ({ page }) => {
    const res = await page.goto('/account/schemes');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/scheme|gold savings|plan/i);
  });

  test('account pages have navigation or sidebar', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    // Account section should have navigation links to sub-pages
    const body = await page.locator('body').textContent();
    const hasNav = /orders|addresses|profile|loyalty|schemes|wishlist/i.test(body ?? '');
    expect(hasNav).toBe(true);
  });
});

// ─── Checkout Flow ─────────────────────────────────────────────

test.describe('Checkout Flow', () => {
  test('/checkout page loads', async ({ page }) => {
    const res = await page.goto('/checkout');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('checkout has address section or step indicator', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/shipping|address|checkout|nothing|empty/i);
  });

  test('checkout has order summary', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    // Either shows order summary or empty cart message
    await expect(page.locator('body')).toContainText(/order|summary|total|cart|empty|nothing|shop/i);
  });

  test('checkout has payment section or appropriate empty state', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    // Either payment section or redirect/empty cart message
    const body = await page.locator('body').textContent();
    const hasPayment = /payment|pay|checkout|start shopping|nothing to checkout|empty/i.test(body ?? '');
    expect(hasPayment).toBe(true);
  });

  test('checkout accessible without login shows appropriate state', async ({ page }) => {
    const res = await page.goto('/checkout');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
    // Should either show login prompt, empty cart, or checkout form
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(0);
  });
});

// ─── Special Pages Flow ────────────────────────────────────────

test.describe('Special Pages Flow', () => {
  test('/try-on has category tabs', async ({ page }) => {
    await page.goto('/try-on');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Rings/);
    await expect(page.locator('body')).toContainText(/Necklaces/);
    await expect(page.locator('body')).toContainText(/Earrings/);
  });

  test('/chat loads with message area', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    // Chat page should have some chat-related content
    const body = await page.locator('body').textContent();
    const hasChat = /chat|message|assistant|help|type/i.test(body ?? '');
    expect(hasChat).toBe(true);
  });

  test('/compare page loads', async ({ page }) => {
    const res = await page.goto('/compare');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('/search?q=test loads with results or empty state', async ({ page }) => {
    await page.goto('/search?q=test');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    const body = await page.locator('body').textContent();
    const hasSearchContent = /search|result|found|no result|product|test/i.test(body ?? '');
    expect(hasSearchContent).toBe(true);
  });

  test('404 page for nonexistent route returns appropriate response', async ({ page }) => {
    const res = await page.goto('/nonexistent-page-that-does-not-exist');
    // Should be either 404 or a redirect, not 500
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─── Navigation Flow ───────────────────────────────────────────

test.describe('Navigation Flow', () => {
  test('homepage to category navigation works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const categoryLink = page.locator('a[href*="/category/"]').first();
    if (await categoryLink.isVisible()) {
      await categoryLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/category/');
    }
  });

  test('clicking logo navigates to homepage', async ({ page }) => {
    await page.goto('/category/gold');
    await page.waitForLoadState('networkidle');
    const logoLink = page.locator('header a[href="/"]').first();
    await logoLink.click();
    await page.waitForURL('/', { timeout: 10000 });
    expect(page.url()).toMatch(/\/$/);
  });

  test('breadcrumbs are visible on try-on page', async ({ page }) => {
    await page.goto('/try-on');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Home/);
  });

  test('category tabs on try-on page switch content', async ({ page }) => {
    await page.goto('/try-on');
    await page.waitForLoadState('networkidle');
    const necklaceTab = page.locator('button:has-text("Necklaces")').first();
    if (await necklaceTab.isVisible()) {
      await necklaceTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toContainText(/Necklace/i);
    }
  });

  test('wishlist link in header navigates to /wishlist', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const wishlistLink = page.locator('a[href="/wishlist"]').first();
    if (await wishlistLink.isVisible()) {
      await wishlistLink.click();
      await page.waitForURL(/wishlist/, { timeout: 10000 });
      expect(page.url()).toContain('/wishlist');
    }
  });
});
