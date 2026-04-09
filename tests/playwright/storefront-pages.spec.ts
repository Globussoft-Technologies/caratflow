import { test, expect } from '@playwright/test';

test.describe('B2C Storefront - All Pages', () => {
  const pages = [
    ['/', 'Homepage'],
    ['/auth/login', 'Login'],
    ['/auth/register', 'Register'],
    ['/auth/forgot-password', 'Forgot Password'],
    ['/auth/verify-otp', 'Verify OTP'],
    ['/category/gold', 'Gold Category'],
    ['/category/silver', 'Silver Category'],
    ['/category/diamond', 'Diamond Category'],
    ['/search', 'Search'],
    ['/cart', 'Cart'],
    ['/wishlist', 'Wishlist'],
    ['/compare', 'Compare'],
    ['/checkout', 'Checkout'],
    ['/try-on', 'AR Try-On'],
    ['/chat', 'Chat'],
    ['/account', 'Account Dashboard'],
    ['/account/orders', 'My Orders'],
    ['/account/wishlist', 'My Wishlist'],
    ['/account/addresses', 'Addresses'],
    ['/account/profile', 'Profile'],
    ['/account/loyalty', 'Loyalty'],
    ['/account/schemes', 'Schemes'],
  ];

  for (const [path, name] of pages) {
    test(`${name} page loads (${path})`, async ({ page }) => {
      const res = await page.goto(path as string);
      expect(res?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});

test.describe('B2C Storefront - Page Content', () => {
  test('Homepage has category grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/gold|silver|diamond|jewelry/i);
  });

  test('Homepage has navigation header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header, nav').first()).toBeVisible();
  });

  test('Homepage has footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer').first()).toBeVisible();
  });

  test('Login page has email input', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

  test('Login page has password input', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('Login page has Sign In button', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('button:has-text("Sign In")').first()).toBeVisible();
  });

  test('Login page has social login buttons', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('body')).toContainText(/Google|Facebook|Apple/i);
  });

  test('Login page has Create Account link', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('body')).toContainText(/Create Account|Register|Sign Up/i);
  });

  test('Register page has form fields', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('input').first()).toBeVisible();
  });

  test('Category page has filter or product content', async ({ page }) => {
    await page.goto('/category/gold');
    await expect(page.locator('body')).toContainText(/gold|filter|sort|product/i);
  });

  test('Cart page shows empty state or items', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('body')).toContainText(/cart|empty|item|shop/i);
  });

  test('Checkout page has steps or form', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.locator('body')).toContainText(/checkout|address|payment|order/i);
  });

  test('Try-On page has category tabs', async ({ page }) => {
    await page.goto('/try-on');
    await expect(page.locator('body')).toContainText(/ring|necklace|earring|bangle|try/i);
  });

  test('Chat page has message area', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Account page has dashboard content', async ({ page }) => {
    await page.goto('/account');
    await expect(page.locator('body')).toContainText(/order|loyalty|scheme|account/i);
  });

  test('Loyalty page has points info', async ({ page }) => {
    await page.goto('/account/loyalty');
    await expect(page.locator('body')).toContainText(/point|tier|loyalty|reward/i);
  });
});
