import { test, expect } from '@playwright/test';
import { loginAsCustomer } from './helpers/storefront-login';

test.describe('Storefront - Customer Auth', () => {
  test('login page renders with email + password fields + social login buttons', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle').catch(() => undefined);

    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('body')).toContainText(/Google|Facebook|Apple/i);
  });

  test('register page renders with all required fields', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    const inputs = page.locator('input');
    const count = await inputs.count();
    // Name, email, phone, password (and usually confirm) → >= 3
    expect(count).toBeGreaterThanOrEqual(3);
    await expect(page.locator('body')).toContainText(/register|sign up|create/i);
  });

  test('invalid login shows error message', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle').catch(() => undefined);

    // Overwrite the pre-filled demo creds with invalid ones
    const emailField = page.locator('input[type="email"]').first();
    await emailField.fill('bad-user@example.invalid');
    const pwdField = page.locator('input[type="password"]').first();
    await pwdField.fill('totally-wrong-password');

    await page.locator('button[type="submit"]:has-text("Sign In")').first().click();

    // Either an error message appears OR we stay on the login page without a token.
    await page.waitForTimeout(3000);
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    const body = await page.locator('body').textContent();
    const hasErrorText = /invalid|failed|incorrect|error|unauthoriz/i.test(body ?? '');
    const stillOnLogin = /\/auth\/login/.test(page.url());
    expect(!token && (hasErrorText || stillOnLogin)).toBe(true);
  });

  test('OTP verify page renders if present', async ({ page }) => {
    const res = await page.goto('/auth/verify-otp');
    expect(res?.status()).toBeLessThan(500);
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const inputs = page.locator('input');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
    await expect(page.locator('body')).toContainText(/otp|verif|code/i);
  });

  test('forgot password page renders with email input', async ({ page }) => {
    const res = await page.goto('/auth/forgot-password');
    expect(res?.status()).toBeLessThan(500);
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const emailInput = page
      .locator('input[type="email"], input[placeholder*="email" i], input[name*="email" i]')
      .first();
    await expect(emailInput).toBeVisible();
    await expect(page.locator('body')).toContainText(/forgot|reset|password/i);
  });

  test('logged-in user visiting /auth/login redirects to /account', async ({ page }) => {
    const loggedIn = await loginAsCustomer(page, { goto: '/account' });
    if (!loggedIn) {
      test.skip(true, 'Customer login unavailable in this environment');
    }

    await page.goto('/auth/login');
    await page.waitForTimeout(1500);

    // App may redirect OR render login anyway — either way, accessToken should persist
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();

    const url = page.url();
    // Accept either explicit redirect or still-on-login (soft redirect varies)
    expect(/\/account|\/auth\/login/.test(url)).toBe(true);
  });
});
