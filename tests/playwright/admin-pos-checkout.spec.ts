import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/admin-login';

// End-to-end POS checkout flow: search -> add to cart -> charge -> payment dialog -> sale detail.
// Tolerant of empty seed data (product grid empty) so it doesn't false-fail in bare environments.

test.describe('Admin POS checkout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, { goto: '/admin/retail/pos' });
  });

  test('POS page renders with header and search box', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    // PageHeader text "Point of Sale" or just "POS" — match loosely
    await expect(page.locator('body')).toContainText(/POS|Point of Sale|Cart|Checkout/i);
    // Search input (placeholder defined in PosProductSearch.tsx)
    const search = page.locator('input[placeholder*="SKU" i], input[placeholder*="search" i]').first();
    await expect(search).toBeVisible();
  });

  test('Product grid either shows products or an empty state (no crash)', async ({ page }) => {
    // Wait for initial tRPC query to settle
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(/Something went wrong/i);
    // Either product cards exist or an empty/loading message — both acceptable
    const hasContent = await page.locator('button, [role="button"], article, .rounded, [data-testid="pos-product"]').count();
    expect(hasContent).toBeGreaterThan(0);
  });

  test('Typing in search updates the search input value', async ({ page }) => {
    const search = page.locator('input[placeholder*="SKU" i], input[placeholder*="search" i]').first();
    await search.fill('gold');
    await expect(search).toHaveValue('gold');
  });

  test('Clicking a product adds a line item to the cart (if any products exist)', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    // Product cards in PosProductSearch render as buttons/cards — be forgiving
    const productCard = page
      .locator('button, [role="button"]')
      .filter({ hasText: /SKU|Gold|Silver|Diamond|Necklace|Ring|Bangle|Earring|Pendant/i })
      .first();

    const hasProduct = await productCard.isVisible().catch(() => false);
    test.skip(!hasProduct, 'No products seeded for this tenant/location — POS cart test skipped.');

    await productCard.click();

    // Cart should now contain at least one line (look for quantity control or a total)
    await expect(
      page.locator('text=/total|subtotal|charge|pay/i').first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('Charge button is present and opens the payment dialog when cart has items', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const productCard = page
      .locator('button, [role="button"]')
      .filter({ hasText: /SKU|Gold|Silver|Diamond|Necklace|Ring|Bangle|Earring|Pendant/i })
      .first();
    const hasProduct = await productCard.isVisible().catch(() => false);
    test.skip(!hasProduct, 'No products seeded — skipping charge dialog test.');

    await productCard.click();

    const chargeBtn = page.getByRole('button', { name: /charge|pay|checkout/i }).first();
    await expect(chargeBtn).toBeVisible({ timeout: 5000 });
    await chargeBtn.click();

    // Payment dialog should appear. PosPaymentDialog uses placeholder "Amount (₹)"
    const amountInput = page.locator('input[placeholder*="Amount" i]').first();
    await expect(amountInput).toBeVisible({ timeout: 5000 });
  });

  test('Page does not surface an error boundary', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').textContent();
    expect(body).not.toMatch(/Something went wrong/i);
    expect(body).not.toMatch(/Application error/i);
  });
});
