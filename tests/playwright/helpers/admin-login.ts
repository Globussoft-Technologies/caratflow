import type { Page } from '@playwright/test';

/**
 * Log in via the admin login form using the standard demo credentials.
 * Tenant, email, and password are pre-filled by the admin login page in dev/demo,
 * so we just click Sign In and wait for the navigation to settle.
 *
 * Callers may pass a `goto` URL to land on after login (relative to baseURL).
 */
export async function loginAsAdmin(
  page: Page,
  options: { goto?: string; tenant?: string; email?: string; password?: string } = {},
): Promise<void> {
  const {
    goto,
    tenant = 'sharma-jewellers',
    email = 'admin@sharmajewellers.com',
    password = 'admin123',
  } = options;

  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');

  // Fill all visible inputs defensively (pre-fill may or may not be present).
  const inputs = page.locator('input');
  const count = await inputs.count();
  if (count >= 3) {
    // Form expected: tenant, email, password (first, type=email, type=password)
    await inputs.nth(0).fill(tenant).catch(() => undefined);
  }

  const emailField = page.locator('input[type="email"]').first();
  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill(email);
  }
  const pwdField = page.locator('input[type="password"]').first();
  if (await pwdField.isVisible().catch(() => false)) {
    await pwdField.fill(password);
  }

  await page.locator('button[type="submit"]').first().click();

  // Wait for JWT to land in localStorage OR for a dashboard-ish URL.
  await page
    .waitForFunction(
      () =>
        !!localStorage.getItem('accessToken') ||
        /\/admin\/(dashboard|inventory|retail|manufacturing|finance|crm|wholesale|ecommerce|compliance|export|reports|cms|settings)/.test(
          location.pathname,
        ),
      undefined,
      { timeout: 15000 },
    )
    .catch(() => undefined);

  if (goto) {
    await page.goto(goto);
    await page.waitForLoadState('networkidle').catch(() => undefined);
  }
}
