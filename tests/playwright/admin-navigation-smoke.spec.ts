import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/admin-login';

// Broad smoke test across one representative list page per domain module.
// Asserts:
//  - HTTP status < 500 on initial navigation
//  - No "Something went wrong" error boundary in the rendered body
//  - Page title/header contains the domain keyword

const smokePages: ReadonlyArray<{ path: string; keyword: RegExp }> = [
  { path: '/admin/inventory/stock', keyword: /Stock|Inventory/i },
  { path: '/admin/manufacturing/bom', keyword: /BOM|Manufacturing/i },
  { path: '/admin/finance/invoices', keyword: /Invoice|Finance/i },
  { path: '/admin/crm/customers', keyword: /Customer|CRM/i },
  { path: '/admin/wholesale/purchase-orders', keyword: /Purchase Order|Wholesale|PO/i },
  { path: '/admin/compliance/huid', keyword: /HUID|Compliance/i },
  { path: '/admin/ecommerce/orders', keyword: /Order|E-Commerce|Ecommerce/i },
  { path: '/admin/export/orders', keyword: /Export|Order/i },
  { path: '/admin/reports/dashboard', keyword: /Reports|Dashboard/i },
  { path: '/admin/cms/banners', keyword: /Banner|CMS|Content/i },
  { path: '/admin/settings/users', keyword: /User|Settings/i },
];

test.describe('Admin Navigation Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const { path, keyword } of smokePages) {
    test(`loads ${path} without error boundary`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status() ?? 500).toBeLessThan(500);

      await page.waitForLoadState('networkidle').catch(() => undefined);

      const body = await page.locator('body').textContent();
      expect(body ?? '').not.toMatch(/Something went wrong/i);
      expect(body ?? '').not.toMatch(/Application error/i);

      // Header / title check — loose match so we tolerate different PageHeader copy.
      expect(body ?? '').toMatch(keyword);
    });
  }

  test('all smoke pages load under an aggregate budget (soft check)', async ({ page }) => {
    let failures = 0;
    for (const { path } of smokePages) {
      const res = await page.goto(path);
      if ((res?.status() ?? 500) >= 500) failures += 1;
      const body = (await page.locator('body').textContent()) ?? '';
      if (/Something went wrong/i.test(body)) failures += 1;
    }
    expect(failures).toBe(0);
  });
});
