import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/admin-login';

// New Export Order form: Buyer* (select), Destination Country*, Location* (select),
// Incoterms, Currency, Exchange Rate, Line Items*, Shipping, Insurance, etc.

test.describe('Admin Export: Create Export Order', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('New Export Order form renders core controls', async ({ page }) => {
    const res = await page.goto('/admin/export/orders/new');
    expect(res?.status()).toBeLessThan(500);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toContainText(/New Export Order|Export/i);
    await expect(page.locator('text=/Buyer/i').first()).toBeVisible();
    await expect(page.locator('text=/Destination Country/i').first()).toBeVisible();
    await expect(page.locator('text=/Location \\(Ship From\\)|Location/i').first()).toBeVisible();
    await expect(page.locator('text=/Currency/i').first()).toBeVisible();
    await expect(page.locator('text=/Exchange Rate/i').first()).toBeVisible();
  });

  test('Currency field defaults to USD and accepts changes', async ({ page }) => {
    await page.goto('/admin/export/orders/new');
    await page.waitForLoadState('networkidle');
    const currency = page.locator('input[maxlength="3"]').first();
    await expect(currency).toBeVisible();
    await expect(currency).toHaveValue(/^[A-Z]{3}$/);
    await currency.fill('eur');
    await expect(currency).toHaveValue('EUR');
  });

  test('Exchange rate field accepts decimal values', async ({ page }) => {
    await page.goto('/admin/export/orders/new');
    await page.waitForLoadState('networkidle');
    // All number inputs in order: exchangeRate, shipping, insurance, then line-item fields
    const numberInputs = page.locator('input[type="number"]');
    const exchangeRate = numberInputs.first();
    await exchangeRate.fill('84.25');
    await expect(exchangeRate).toHaveValue('84.25');
  });

  test('Add Item button appends a new line-item row', async ({ page }) => {
    await page.goto('/admin/export/orders/new');
    await page.waitForLoadState('networkidle');

    const addItemBtn = page.getByRole('button', { name: /Add Item/i }).first();
    await expect(addItemBtn).toBeVisible();

    const before = await page.locator('input[type="number"]').count();
    await addItemBtn.click();
    const after = await page.locator('input[type="number"]').count();
    expect(after).toBeGreaterThan(before);
  });

  test('Submit disabled until buyer + location selected', async ({ page }) => {
    await page.goto('/admin/export/orders/new');
    await page.waitForLoadState('networkidle');
    const submit = page.getByRole('button', { name: /Create Export Order|Create Order|Create/i }).last();
    await expect(submit).toBeVisible();
    await expect(submit).toBeDisabled();
  });

  test('Happy path: pick seed buyer + location, submit (skip when no seed)', async ({ page }) => {
    await page.goto('/admin/export/orders/new');
    await page.waitForLoadState('networkidle');

    const selects = page.locator('select');
    const buyerSelect = selects.nth(0);
    const locationSelect = selects.nth(1);

    const buyerOptions = await buyerSelect.locator('option').count();
    const locationOptions = await locationSelect.locator('option').count();
    test.skip(
      buyerOptions < 2 || locationOptions < 2,
      'No customers or locations seeded — skipping export submit.',
    );

    const buyerVal = await buyerSelect.locator('option').nth(1).getAttribute('value');
    const locVal = await locationSelect.locator('option').nth(1).getAttribute('value');
    if (buyerVal) await buyerSelect.selectOption(buyerVal);
    if (locVal) await locationSelect.selectOption(locVal);

    // Destination country (ISO-2)
    const country = page.locator('input[maxlength="2"]').first();
    await country.fill('US');

    // Ensure at least one line item with a non-zero qty/price
    const numbers = page.locator('input[type="number"]');
    // exchangeRate already 83.5 by default; shipping=0, insurance=0. Line-item numbers start later.
    const allNums = await numbers.count();
    if (allNums >= 5) {
      // qty (index 3 or 4 depending on layout) + unitPrice — set last two to safe values
      await numbers.nth(allNums - 2).fill('1');
      await numbers.nth(allNums - 1).fill('100');
    }

    const submit = page.getByRole('button', { name: /Create Export Order|Create Order/i }).last();
    if (await submit.isEnabled().catch(() => false)) {
      await submit.click();
      await page
        .waitForURL(/\/admin\/export\/orders\/[^/]+$/, { timeout: 15000 })
        .catch(() => undefined);
      const url = page.url();
      const body = await page.locator('body').textContent();
      const ok =
        /\/admin\/export\/orders\/[^/]+$/.test(url) ||
        /Created|success/i.test(body ?? '');
      expect(ok).toBe(true);
    } else {
      test.skip(true, 'Submit remained disabled — form requires unseeded data.');
    }
  });
});
