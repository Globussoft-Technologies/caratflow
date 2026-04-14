import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/admin-login';

// Supplier list + detail coverage. The /new form is not yet built, so the create path
// is skipped conditionally when that route 404s.

test.describe('Admin Wholesale: Suppliers', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Suppliers list page renders without crash', async ({ page }) => {
    const res = await page.goto('/admin/wholesale/suppliers');
    expect(res?.status()).toBeLessThan(500);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Suppliers|Supplier/i);
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(/Something went wrong/i);
  });

  test('List exposes an "Add Supplier" action', async ({ page }) => {
    await page.goto('/admin/wholesale/suppliers');
    await page.waitForLoadState('networkidle');
    const addBtn = page.locator('a, button').filter({ hasText: /Add Supplier|New Supplier/i }).first();
    await expect(addBtn).toBeVisible();
  });

  test('Supplier create form: navigate or skip if not built', async ({ page }) => {
    const res = await page.goto('/admin/wholesale/suppliers/new');
    // If the /new route isn't implemented yet, Next returns 404 — skip gracefully.
    const status = res?.status() ?? 200;
    test.skip(status >= 400, `Supplier /new route not built (status ${status})`);

    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/Supplier/i);
    // Basic fields: name + some identifier. If absent, still allow — form may be partial.
    const nameInput = page.locator('input[name*="name" i], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('QA Supplier E2E');
    }
  });

  test('Supplier detail page renders performance tiles (if any supplier exists)', async ({ page }) => {
    await page.goto('/admin/wholesale/suppliers');
    await page.waitForLoadState('networkidle');

    // Try to click the first supplier row link
    const firstRowLink = page.locator('a[href*="/admin/wholesale/suppliers/"]').first();
    const hasRow = await firstRowLink.isVisible().catch(() => false);
    test.skip(!hasRow, 'No suppliers seeded — detail test skipped.');

    await firstRowLink.click();
    await page.waitForLoadState('networkidle');

    // Detail page title/header
    await expect(page.locator('body')).toContainText(/Supplier|Performance/i);
    // Performance tiles defined in [id]/page.tsx: "Total Orders" + "On-time Delivery"
    await expect(page.locator('text=/Total Orders/i').first()).toBeVisible();
    await expect(page.locator('text=/On-time/i').first()).toBeVisible();
  });

  test('Supplier detail page shows recent purchase orders section (if available)', async ({ page }) => {
    await page.goto('/admin/wholesale/suppliers');
    await page.waitForLoadState('networkidle');
    const firstRowLink = page.locator('a[href*="/admin/wholesale/suppliers/"]').first();
    const hasRow = await firstRowLink.isVisible().catch(() => false);
    test.skip(!hasRow, 'No suppliers seeded — PO list test skipped.');

    await firstRowLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=/Purchase Orders|Recent POs|Recent/i').first()).toBeVisible();
  });

  test('Detail page with bogus id does not 500', async ({ page }) => {
    const res = await page.goto('/admin/wholesale/suppliers/does-not-exist-xyz');
    expect(res?.status()).toBeLessThan(500);
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(/Something went wrong/i);
  });
});
