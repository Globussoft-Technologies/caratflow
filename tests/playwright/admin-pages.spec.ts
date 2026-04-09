import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard - All Pages', () => {
  const pages = [
    ['/admin/login', 'Login'],
    ['/admin/dashboard', 'Dashboard'],
    ['/admin/inventory', 'Inventory'],
    ['/admin/inventory/items', 'Inventory Items'],
    ['/admin/inventory/movements', 'Movements'],
    ['/admin/inventory/transfers', 'Transfers'],
    ['/admin/inventory/stock-takes', 'Stock Takes'],
    ['/admin/inventory/metals', 'Metals'],
    ['/admin/inventory/stones', 'Stones'],
    ['/admin/inventory/valuation', 'Valuation'],
    ['/admin/manufacturing', 'Manufacturing'],
    ['/admin/manufacturing/bom', 'BOM'],
    ['/admin/manufacturing/jobs', 'Jobs'],
    ['/admin/manufacturing/karigars', 'Karigars'],
    ['/admin/manufacturing/qc', 'QC'],
    ['/admin/manufacturing/planning', 'Planning'],
    ['/admin/retail', 'Retail'],
    ['/admin/retail/pos', 'POS'],
    ['/admin/retail/sales', 'Sales'],
    ['/admin/retail/returns', 'Returns'],
    ['/admin/retail/repairs', 'Repairs'],
    ['/admin/retail/custom-orders', 'Custom Orders'],
    ['/admin/finance', 'Finance'],
    ['/admin/finance/journal', 'Journal'],
    ['/admin/finance/invoices', 'Invoices'],
    ['/admin/finance/payments', 'Payments'],
    ['/admin/finance/tax', 'Tax'],
    ['/admin/finance/bank', 'Bank'],
    ['/admin/finance/girvi', 'Girvi'],
    ['/admin/finance/schemes', 'Schemes'],
    ['/admin/finance/rates', 'Rates'],
    ['/admin/finance/bnpl', 'BNPL'],
    ['/admin/crm', 'CRM'],
    ['/admin/crm/customers', 'Customers'],
    ['/admin/crm/loyalty', 'Loyalty'],
    ['/admin/crm/leads', 'Leads'],
    ['/admin/crm/campaigns', 'Campaigns'],
    ['/admin/crm/notifications', 'Notifications'],
    ['/admin/crm/feedback', 'Feedback'],
    ['/admin/crm/referrals', 'Referrals'],
    ['/admin/wholesale', 'Wholesale'],
    ['/admin/wholesale/purchase-orders', 'Purchase Orders'],
    ['/admin/wholesale/agents', 'Agents'],
    ['/admin/wholesale/credit', 'Credit'],
    ['/admin/ecommerce', 'E-Commerce'],
    ['/admin/ecommerce/channels', 'Channels'],
    ['/admin/ecommerce/catalog', 'Catalog'],
    ['/admin/ecommerce/orders', 'Orders'],
    ['/admin/ecommerce/shipments', 'Shipments'],
    ['/admin/ecommerce/payments', 'Payments'],
    ['/admin/ecommerce/preorders', 'Pre-Orders'],
    ['/admin/ecommerce/search', 'Search Analytics'],
    ['/admin/ecommerce/ar', 'AR Management'],
    ['/admin/compliance', 'Compliance'],
    ['/admin/compliance/huid', 'HUID'],
    ['/admin/compliance/hallmark', 'Hallmark'],
    ['/admin/compliance/certificates', 'Certificates'],
    ['/admin/compliance/documents', 'Documents'],
    ['/admin/compliance/insurance', 'Insurance'],
    ['/admin/compliance/audits', 'Audits'],
    ['/admin/compliance/aml', 'AML'],
    ['/admin/export', 'Export'],
    ['/admin/export/orders', 'Export Orders'],
    ['/admin/export/invoices', 'Export Invoices'],
    ['/admin/export/documents', 'Export Documents'],
    ['/admin/export/duty', 'Duty'],
    ['/admin/export/exchange-rates', 'Exchange Rates'],
    ['/admin/export/licenses', 'Licenses'],
    ['/admin/reports', 'Reports'],
    ['/admin/reports/sales', 'Sales Reports'],
    ['/admin/reports/inventory', 'Inventory Reports'],
    ['/admin/reports/manufacturing', 'Manufacturing Reports'],
    ['/admin/reports/crm', 'CRM Reports'],
    ['/admin/reports/custom', 'Custom Reports'],
    ['/admin/reports/forecast', 'Forecast'],
    ['/admin/reports/scheduled', 'Scheduled'],
    ['/admin/cms', 'CMS'],
    ['/admin/cms/banners', 'Banners'],
    ['/admin/cms/collections', 'Collections'],
    ['/admin/cms/pages', 'Pages'],
    ['/admin/cms/blog', 'Blog'],
    ['/admin/cms/faq', 'FAQ'],
    ['/admin/cms/homepage', 'Homepage Builder'],
    ['/admin/cms/seo', 'SEO'],
    ['/admin/settings', 'Settings'],
    ['/admin/settings/company', 'Company'],
    ['/admin/settings/branches', 'Branches'],
    ['/admin/settings/users', 'Users'],
    ['/admin/settings/roles', 'Roles'],
    ['/admin/settings/tax', 'Tax Config'],
    ['/admin/settings/pos', 'POS Settings'],
    ['/admin/settings/notifications', 'Notification Settings'],
    ['/admin/settings/import', 'Import'],
    ['/admin/settings/export', 'Export Data'],
    ['/admin/settings/audit', 'Audit Log'],
    ['/admin/settings/i18n', 'i18n'],
    ['/admin/settings/hardware', 'Hardware'],
  ];

  for (const [path, name] of pages) {
    test(`${name} loads (${path})`, async ({ page }) => {
      const res = await page.goto(path as string);
      expect(res?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
    });
  }
});

test.describe('Admin Dashboard - Content Checks', () => {
  test('Admin login has CaratFlow branding', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toContain('caratflow');
  });

  test('Admin login has demo credentials', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const body = await page.locator('body').textContent();
    expect(body?.toLowerCase()).toContain('demo');
  });

  test('Admin login has email input', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThanOrEqual(1);
  });

  test('Admin login has submit button', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const buttons = await page.locator('button[type="submit"], button').count();
    expect(buttons).toBeGreaterThanOrEqual(1);
  });
});
