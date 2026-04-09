import { test, expect } from '@playwright/test';

test.describe('B2C Login Flow E2E', () => {
  test('Login page shows demo credentials banner', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Demo Credentials')).toBeVisible();
    await expect(page.locator('text=admin@sharmajewellers.com')).toBeVisible();
    await expect(page.locator('text=admin123')).toBeVisible();
  });

  test('Email field is pre-filled', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    const email = page.locator('input[type="email"]').first();
    await expect(email).toHaveValue('admin@sharmajewellers.com');
  });

  test('Password field is pre-filled', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    const pwd = page.locator('input[type="password"]').first();
    await expect(pwd).toHaveValue('admin123');
  });

  test('Clicking Sign In with pre-filled creds shows success', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Sign In")');
    await expect(page.locator('text=Login successful')).toBeVisible({ timeout: 10000 });
  });

  test('Login stores token in localStorage', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(4000);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
    expect(token!.startsWith('eyJ')).toBe(true);
  });

  test('Login stores refresh token in localStorage', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(4000);
    const token = await page.evaluate(() => localStorage.getItem('refreshToken'));
    expect(token).toBeTruthy();
  });

  test('Can navigate from login to register', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.click('text=Create Account');
    await expect(page).toHaveURL(/register/);
  });

  test('Can navigate from login to forgot password', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.click('text=Forgot');
    await expect(page).toHaveURL(/forgot/);
  });

  test('Phone login tab switches to phone input', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Phone")');
    await expect(page.locator('input[type="tel"], input[placeholder*="phone" i]').first()).toBeVisible();
  });
});

test.describe('Admin Login Flow E2E', () => {
  test('Admin login page loads and has form', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toContain('caratflow');
  });

  test('Admin login has input fields', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThanOrEqual(2);
  });

  test('Admin login has demo info', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body).toContain('sharmajewellers');
  });
});

test.describe('Navigation E2E', () => {
  test('Homepage header has navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header, nav').first()).toBeVisible();
  });

  test('Homepage to category navigation', async ({ page }) => {
    await page.goto('/category/gold');
    await expect(page.locator('body')).toBeVisible();
    // Verify we can navigate directly to a category
    const res = await page.goto('/category/silver');
    expect(res?.status()).toBeLessThan(500);
  });

  test('Homepage to cart navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const cartLink = page.locator('a[href="/cart"], [href="/cart"]').first();
    if (await cartLink.isVisible()) {
      await cartLink.click();
      await expect(page).toHaveURL(/cart/);
    }
  });

  test('Cart page has continue shopping link', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('body')).toContainText(/continue|shop|browse|empty/i);
  });

  test('Search page accepts query', async ({ page }) => {
    await page.goto('/search?q=gold');
    await expect(page.locator('body')).toBeVisible();
  });
});
