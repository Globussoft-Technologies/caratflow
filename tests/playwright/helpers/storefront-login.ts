import type { Page } from '@playwright/test';

/**
 * Log in to the B2C storefront via the /auth/login form. The login page
 * pre-fills a demo customer (actually the admin user for sharma-jewellers),
 * so we just click "Sign In" and wait for the JWT to land in localStorage.
 *
 * On success, the app routes to /account. Callers can pass `goto` to land
 * somewhere else after login.
 *
 * Returns true if login appears to have succeeded (accessToken present),
 * false otherwise. Tests that strictly require login should branch on this.
 */
export async function loginAsCustomer(
  page: Page,
  options: { goto?: string; email?: string; password?: string } = {},
): Promise<boolean> {
  const {
    goto,
    email = 'admin@sharmajewellers.com',
    password = 'admin123',
  } = options;

  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle').catch(() => undefined);

  // Ensure email tab is active (default is Email)
  const emailTab = page.locator('button:has-text("Email")').first();
  if (await emailTab.isVisible().catch(() => false)) {
    await emailTab.click().catch(() => undefined);
  }

  const emailField = page.locator('input[type="email"]').first();
  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill(email).catch(() => undefined);
  }
  const pwdField = page.locator('input[type="password"]').first();
  if (await pwdField.isVisible().catch(() => false)) {
    await pwdField.fill(password).catch(() => undefined);
  }

  // Click the email/password Sign In (avoid the social buttons which say "Continue with ...")
  await page.locator('button[type="submit"]:has-text("Sign In")').first().click().catch(async () => {
    // Fallback: any submit button
    await page.locator('button[type="submit"]').first().click().catch(() => undefined);
  });

  const ok = await page
    .waitForFunction(() => !!localStorage.getItem('accessToken'), undefined, { timeout: 10000 })
    .then(() => true)
    .catch(() => false);

  if (ok && goto) {
    await page.goto(goto);
    await page.waitForLoadState('networkidle').catch(() => undefined);
  }

  return ok;
}

/**
 * Programmatic login using the REST auth endpoint directly. Useful for
 * skipping the form when we only need a token in localStorage.
 */
export async function loginAsCustomerViaApi(
  page: Page,
  options: {
    goto?: string;
    email?: string;
    password?: string;
    tenantSlug?: string;
  } = {},
): Promise<boolean> {
  const {
    goto,
    email = 'admin@sharmajewellers.com',
    password = 'admin123',
    tenantSlug = 'sharma-jewellers',
  } = options;

  // Navigate to an app origin first so localStorage writes land on the right origin.
  await page.goto('/').catch(() => undefined);

  const result = await page.evaluate(
    async (creds) => {
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creds),
        });
        const data = await res.json();
        if (data?.success && data?.data?.accessToken) {
          localStorage.setItem('accessToken', data.data.accessToken);
          if (data.data.refreshToken) {
            localStorage.setItem('refreshToken', data.data.refreshToken);
          }
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    { email, password, tenantSlug },
  );

  if (result && goto) {
    await page.goto(goto);
    await page.waitForLoadState('networkidle').catch(() => undefined);
  }

  return !!result;
}
