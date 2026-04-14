import { test, expect } from '@playwright/test';

/**
 * Smoke-test every top-level storefront route:
 *  - HTTP status < 500
 *  - page does not render a React error boundary ("Something went wrong")
 */
const routes: Array<[string, string]> = [
  ['/', 'Homepage'],
  ['/category/gold', 'Category (gold)'],
  ['/product/test-product', 'Product Detail'],
  ['/cart', 'Cart'],
  ['/wishlist', 'Wishlist'],
  ['/compare', 'Compare'],
  ['/search', 'Search'],
  ['/try-on', 'Try-On'],
  ['/chat', 'Chat'],
  ['/auth/login', 'Login'],
];

test.describe('Storefront - Navigation Smoke', () => {
  for (const [path, name] of routes) {
    test(`${name} (${path}) returns < 500 and has no error boundary`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status(), `status for ${path}`).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      await expect(page.locator('body')).toBeVisible();

      const body = await page.locator('body').textContent();
      const brokenBoundary =
        /Something went wrong|Application error|Unhandled Runtime Error|Client-side exception/i.test(
          body ?? '',
        );
      expect(brokenBoundary, `error boundary visible at ${path}`).toBe(false);
    });
  }
});
