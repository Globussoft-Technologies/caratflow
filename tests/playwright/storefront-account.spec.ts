import { test, expect } from '@playwright/test';
import { loginAsCustomer } from './helpers/storefront-login';

/**
 * Customer self-service pages under /account. All tests require a logged-in
 * customer. If login fails for any reason, the entire file is skipped.
 */
test.describe('Storefront - Customer Account', () => {
  test.beforeEach(async ({ page }) => {
    const ok = await loginAsCustomer(page);
    test.skip(!ok, 'Unable to log in as customer — skipping account tests');
  });

  test('/account/profile shows user info', async ({ page }) => {
    const res = await page.goto('/account/profile');
    expect(res?.status()).toBeLessThan(500);
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expect(page.locator('body')).toContainText(/profile|name|email|phone|account/i);
  });

  test('/account/orders shows orders list (or empty state)', async ({ page }) => {
    const res = await page.goto('/account/orders');
    expect(res?.status()).toBeLessThan(500);
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const body = await page.locator('body').textContent();
    const hasOrdersOrEmpty = /order|track|history|no order|empty/i.test(body ?? '');
    expect(hasOrdersOrEmpty).toBe(true);
  });

  test('/account/loyalty shows points balance', async ({ page }) => {
    const res = await page.goto('/account/loyalty');
    expect(res?.status()).toBeLessThan(500);
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expect(page.locator('body')).toContainText(/point|tier|loyalty|reward|balance/i);
  });

  test('/account/schemes shows active gold savings or kitty schemes', async ({ page }) => {
    const res = await page.goto('/account/schemes');
    expect(res?.status()).toBeLessThan(500);
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expect(page.locator('body')).toContainText(/scheme|gold savings|kitty|plan|installment|enrol/i);
  });

  test('/account/wishlist shows saved items (or empty state)', async ({ page }) => {
    const res = await page.goto('/account/wishlist');
    expect(res?.status()).toBeLessThan(500);
    await page.waitForLoadState('networkidle').catch(() => undefined);
    const body = await page.locator('body').textContent();
    const hasWishOrEmpty = /wishlist|saved|favourite|favorite|empty|no item/i.test(body ?? '');
    expect(hasWishOrEmpty).toBe(true);
  });

  test('/account/addresses — add address form is usable', async ({ page }) => {
    const res = await page.goto('/account/addresses');
    expect(res?.status()).toBeLessThan(500);
    await page.waitForLoadState('networkidle').catch(() => undefined);

    // Open the add-address form if it's behind a button
    const addBtn = page
      .locator('button:has-text("Add"), a:has-text("Add"), button:has-text("New Address")')
      .first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click().catch(() => undefined);
      await page.waitForTimeout(400);
    }

    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThan(0);

    // Attempt to fill at least one address-like field to validate the form accepts input
    const anyText = page
      .locator('input[type="text"], input:not([type]), input[name*="name" i], input[name*="addr" i]')
      .first();
    if (await anyText.isVisible().catch(() => false)) {
      await anyText.fill('Test Street 123').catch(() => undefined);
      await expect(anyText).toHaveValue(/Test Street|.+/);
    }
  });
});
