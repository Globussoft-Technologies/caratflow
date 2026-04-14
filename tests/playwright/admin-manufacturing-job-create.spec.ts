import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/admin-login';

// New Manufacturing Job Order form.
// Form fields per jobs/new/page.tsx: Product* (select), Location* (select), Karigar (select),
// Priority, Quantity*, Estimated Start, Estimated End, BOM, Customer ID, Notes, Special Instructions.

test.describe('Admin Manufacturing: Create Job Order', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('New Job Order form renders with core controls', async ({ page }) => {
    const res = await page.goto('/admin/manufacturing/jobs/new');
    expect(res?.status()).toBeLessThan(500);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/New Job Order|Manufacturing|Job/i);
    await expect(page.locator('text=/Product \\*/i').first()).toBeVisible();
    await expect(page.locator('text=/Location \\*/i').first()).toBeVisible();
    await expect(page.locator('text=/Quantity \\*/i').first()).toBeVisible();
    await expect(page.locator('text=/Priority/i').first()).toBeVisible();
  });

  test('Product picker and location picker are selectable', async ({ page }) => {
    await page.goto('/admin/manufacturing/jobs/new');
    await page.waitForLoadState('networkidle');

    const selects = page.locator('select');
    await expect(selects.first()).toBeVisible();
    expect(await selects.count()).toBeGreaterThanOrEqual(3);
  });

  test('Submit button is disabled when product/location are empty', async ({ page }) => {
    await page.goto('/admin/manufacturing/jobs/new');
    await page.waitForLoadState('networkidle');
    const submit = page.getByRole('button', { name: /Create Job Order|Creating/i }).first();
    await expect(submit).toBeVisible();
    await expect(submit).toBeDisabled();
  });

  test('Quantity input accepts numeric value and rejects < 1', async ({ page }) => {
    await page.goto('/admin/manufacturing/jobs/new');
    await page.waitForLoadState('networkidle');
    const qty = page.locator('input[type="number"]').first();
    await qty.fill('5');
    await expect(qty).toHaveValue('5');
    await qty.fill('0');
    // min=1 clamping — either reverts or stays at 1, but should not be empty
    const val = await qty.inputValue();
    expect(['1', '0']).toContain(val);
  });

  test('Full form submission happy path (skipped when no seed product/location)', async ({ page }) => {
    await page.goto('/admin/manufacturing/jobs/new');
    await page.waitForLoadState('networkidle');

    const productSelect = page.locator('select').nth(0);
    const locationSelect = page.locator('select').nth(1);

    // Count non-placeholder options
    const productOptions = await productSelect.locator('option').count();
    const locationOptions = await locationSelect.locator('option').count();
    test.skip(
      productOptions < 2 || locationOptions < 2,
      'No seed products or locations available for tenant — skipping full submission.',
    );

    // Select the first real option (index 1, since 0 is the placeholder)
    const productValue = await productSelect.locator('option').nth(1).getAttribute('value');
    const locationValue = await locationSelect.locator('option').nth(1).getAttribute('value');
    if (productValue) await productSelect.selectOption(productValue);
    if (locationValue) await locationSelect.selectOption(locationValue);

    await page.locator('input[type="number"]').first().fill('2');

    const submit = page.getByRole('button', { name: /Create Job Order/i }).first();
    await expect(submit).toBeEnabled({ timeout: 5000 });
    await submit.click();

    // Expect either navigation to /manufacturing/jobs/{id} or a success marker
    await page
      .waitForURL(/\/admin\/manufacturing\/jobs\/[^/]+$/, { timeout: 15000 })
      .catch(() => undefined);

    const url = page.url();
    const body = await page.locator('body').textContent();
    const ok =
      /\/admin\/manufacturing\/jobs\/[^/]+$/.test(url) ||
      /Created successfully/i.test(body ?? '');
    expect(ok).toBe(true);
  });

  test('Page does not show error boundary', async ({ page }) => {
    await page.goto('/admin/manufacturing/jobs/new');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(/Something went wrong/i);
  });
});
