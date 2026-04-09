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
  test('Admin login shows CaratFlow title', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('text=CaratFlow')).toBeVisible();
  });

  test('Admin login shows demo credentials', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('text=Demo Credentials')).toBeVisible();
  });

  test('Admin login has business slug field', async ({ page }) => {
    await page.goto('/admin/login');
    const tenant = page.locator('input#tenant, input[value="sharma-jewellers"]').first();
    await expect(tenant).toBeVisible();
  });

  test('Admin login email is pre-filled', async ({ page }) => {
    await page.goto('/admin/login');
    const email = page.locator('input#email, input[type="email"]').first();
    await expect(email).toHaveValue('admin@sharmajewellers.com');
  });

  test('Admin login has forgot password link', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('text=Forgot password')).toBeVisible();
  });

  test('Admin login has create account link', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('text=Create account')).toBeVisible();
  });
});

test.describe('Navigation E2E', () => {
  test('Homepage header has navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header, nav').first()).toBeVisible();
  });

  test('Homepage to category navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const goldLink = page.locator('a[href*="gold"], a:has-text("Gold")').first();
    if (await goldLink.isVisible()) {
      await goldLink.click();
      await expect(page).toHaveURL(/category|gold/);
    }
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
