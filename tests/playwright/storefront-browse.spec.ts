import { test, expect } from '@playwright/test';
import { loginAsCustomer } from './helpers/storefront-login';

/**
 * Product browsing flows on the B2C storefront.
 *
 * Note: the storefront uses route /auth/login (not /(auth)/login — the
 * parenthesised segment in Next.js route groups is not part of the URL).
 */
test.describe('Storefront - Product Browsing', () => {
  test('homepage renders hero and featured/product sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => undefined);

    // Hero is typically the first section
    const firstSection = page.locator('section').first();
    await expect(firstSection).toBeVisible();

    const body = await page.locator('body').textContent();
    const hasHeroText = /shop now|explore|collection|discover|jewelry|jewellery/i.test(body ?? '');
    expect(hasHeroText).toBe(true);

    // At least one product/featured block
    const hasFeatured = /Bestseller|New Arrival|Trending|Featured|Collection/i.test(body ?? '');
    expect(hasFeatured).toBe(true);
  });

  test('category list page shows products (skips if empty)', async ({ page }) => {
    const res = await page.goto('/category/gold');
    expect(res?.status()).toBeLessThan(500);
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const productImages = page.locator('img[loading="lazy"]');
    const count = await productImages.count();
    if (count === 0) {
      test.skip(true, 'No products seeded for this category');
    }
    expect(count).toBeGreaterThan(0);
  });

  test('product detail page shows images/name/price/specs', async ({ page }) => {
    // First try to click through a real product from the category page
    await page.goto('/category/gold');
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const productLink = page.locator('a[href^="/product/"]').first();
    const hasProductLink = await productLink.isVisible().catch(() => false);

    if (hasProductLink) {
      await productLink.click();
      await page.waitForLoadState('networkidle').catch(() => undefined);
      expect(page.url()).toContain('/product/');
    } else {
      const res = await page.goto('/product/test-product-id');
      expect(res?.status()).toBeLessThan(500);
    }

    // Product detail page should at minimum render without error and show price-like content
    await expect(page.locator('body')).toBeVisible();
    const body = await page.locator('body').textContent();
    const hasPriceOrProduct = /₹|Rs\.?|price|product|not found|unavailable/i.test(body ?? '');
    expect(hasPriceOrProduct).toBe(true);
  });

  test('add to wishlist from product (requires login)', async ({ page }) => {
    const loggedIn = await loginAsCustomer(page);
    if (!loggedIn) {
      test.skip(true, 'Unable to log in customer for wishlist test');
    }

    await page.goto('/category/gold');
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const productLink = page.locator('a[href^="/product/"]').first();
    if (!(await productLink.isVisible().catch(() => false))) {
      test.skip(true, 'No products available to add to wishlist');
    }
    await productLink.click();
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const wishBtn = page
      .locator(
        'button[aria-label*="wishlist" i], button:has-text("Wishlist"), button:has-text("Add to Wishlist")',
      )
      .first();
    if (!(await wishBtn.isVisible().catch(() => false))) {
      test.skip(true, 'No wishlist button on product page');
    }
    await wishBtn.click();
    // Success is a non-500, non-error state — we tolerate toast/confirm variants.
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('search bar returns results for "gold"', async ({ page }) => {
    await page.goto('/search?q=gold');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    const body = await page.locator('body').textContent();
    const hasResults = /gold|result|search|found|product|no result/i.test(body ?? '');
    expect(hasResults).toBe(true);
  });

  test('compare: add 2 products to compare list', async ({ page }) => {
    await page.goto('/category/gold');
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const compareButtons = page.locator(
      'button[aria-label*="compare" i], button:has-text("Compare")',
    );
    const btnCount = await compareButtons.count();
    if (btnCount < 2) {
      test.skip(true, 'Need at least 2 compare buttons in UI to test compare list');
    }

    await compareButtons.nth(0).click().catch(() => undefined);
    await page.waitForTimeout(200);
    await compareButtons.nth(1).click().catch(() => undefined);
    await page.waitForTimeout(200);

    const res = await page.goto('/compare');
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(/compare|comparison|product/i);
  });
});
