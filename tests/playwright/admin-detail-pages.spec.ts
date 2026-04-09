import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// 1. Dynamic Route Pages -- test that [id], /new, and sub-pages load without
//    a server error (status < 500) and have Next.js assets loaded.
// ---------------------------------------------------------------------------

test.describe('Admin Dynamic Route Pages', () => {
  const dynamicPages: [string, string][] = [
    // Inventory
    ['/admin/inventory/items/test-id', 'Inventory Item Detail'],

    // Manufacturing
    ['/admin/manufacturing/bom/test-id', 'BOM Detail'],
    ['/admin/manufacturing/jobs/test-id', 'Job Detail'],
    ['/admin/manufacturing/jobs/new', 'New Job'],
    ['/admin/manufacturing/karigars/test-id', 'Karigar Detail'],

    // Retail
    ['/admin/retail/sales/test-id', 'Sale Detail'],
    ['/admin/retail/repairs/test-id', 'Repair Detail'],
    ['/admin/retail/returns/test-id', 'Return Detail'],

    // Finance - Invoices
    ['/admin/finance/invoices/test-id', 'Invoice Detail'],
    ['/admin/finance/invoices/new', 'New Invoice'],

    // Finance - Girvi
    ['/admin/finance/girvi/test-id', 'Girvi Detail'],
    ['/admin/finance/girvi/new', 'New Girvi'],
    ['/admin/finance/girvi/auction', 'Girvi Auction'],

    // Finance - Schemes
    ['/admin/finance/schemes/kitty/test-id', 'Kitty Scheme Detail'],
    ['/admin/finance/schemes/gold-savings/test-id', 'Gold Savings Detail'],

    // Finance - Tax sub-pages
    ['/admin/finance/tax/gstr1', 'GSTR-1'],
    ['/admin/finance/tax/gstr3b', 'GSTR-3B'],

    // Finance - Reports sub-pages
    ['/admin/finance/reports/pnl', 'P&L Report'],
    ['/admin/finance/reports/balance-sheet', 'Balance Sheet'],
    ['/admin/finance/reports/trial-balance', 'Trial Balance'],
    ['/admin/finance/reports/aging', 'Aging Report'],

    // Finance - BNPL sub-pages
    ['/admin/finance/bnpl/providers', 'BNPL Providers'],
    ['/admin/finance/bnpl/plans', 'BNPL Plans'],
    ['/admin/finance/bnpl/transactions', 'BNPL Transactions'],

    // CRM
    ['/admin/crm/customers/test-id', 'Customer Detail'],
    ['/admin/crm/leads/test-id', 'Lead Detail'],
    ['/admin/crm/campaigns/test-id', 'Campaign Detail'],
    ['/admin/crm/loyalty/transactions', 'Loyalty Transactions'],
    ['/admin/crm/notifications/templates', 'Notification Templates'],

    // Wholesale
    ['/admin/wholesale/purchase-orders/test-id', 'PO Detail'],
    ['/admin/wholesale/purchase-orders/new', 'New PO'],
    ['/admin/wholesale/suppliers/test-id', 'Supplier Detail'],
    ['/admin/wholesale/consignments/out', 'Consignments Out'],
    ['/admin/wholesale/consignments/in', 'Consignments In'],
    ['/admin/wholesale/agents/test-id', 'Agent Detail'],
    ['/admin/wholesale/consignments-in/test-id', 'Consignment In Detail'],
    ['/admin/wholesale/consignments-out/test-id', 'Consignment Out Detail'],

    // Compliance
    ['/admin/compliance/huid/test-id', 'HUID Detail'],
    ['/admin/compliance/hallmark/test-id', 'Hallmark Detail'],
    ['/admin/compliance/hallmark/new', 'New Hallmark'],
    ['/admin/compliance/certificates/test-id', 'Certificate Detail'],
    ['/admin/compliance/traceability/test-id', 'Traceability Detail'],
    ['/admin/compliance/aml/alerts', 'AML Alerts'],
    ['/admin/compliance/aml/rules', 'AML Rules'],
    ['/admin/compliance/aml/customers', 'AML Customers'],
    ['/admin/compliance/aml/reports', 'AML Reports'],

    // E-Commerce
    ['/admin/ecommerce/orders/test-id', 'Ecom Order Detail'],
    ['/admin/ecommerce/channels/test-id', 'Channel Detail'],
    ['/admin/ecommerce/catalog/test-id', 'Catalog Item Detail'],
    ['/admin/ecommerce/preorders/test-id', 'Pre-Order Detail'],
    ['/admin/ecommerce/preorders/config', 'Pre-Order Config'],
    ['/admin/ecommerce/ar/test-id', 'AR Product Detail'],

    // Export
    ['/admin/export/orders/test-id', 'Export Order Detail'],
    ['/admin/export/orders/new', 'New Export Order'],
    ['/admin/export/invoices/test-id', 'Export Invoice Detail'],
    ['/admin/export/invoices/new', 'New Export Invoice'],
    ['/admin/export/documents/generate', 'Generate Export Docs'],
    ['/admin/export/duty/hs-codes', 'HS Codes'],
    ['/admin/export/compliance', 'Export Compliance'],

    // Reports sub-pages
    ['/admin/reports/sales/comparison', 'Sales Comparison'],
    ['/admin/reports/inventory/valuation', 'Inventory Valuation Report'],
    ['/admin/reports/custom/test-id', 'Custom Report Detail'],

    // Settings
    ['/admin/settings/branches/test-id', 'Branch Detail'],
    ['/admin/settings/users/test-id', 'User Detail'],
    ['/admin/settings/hardware/test-id', 'Hardware Device Detail'],

    // CMS
    ['/admin/cms/collections/test-id', 'Collection Detail'],
    ['/admin/cms/blog/test-id', 'Blog Post Detail'],
  ];

  for (const [path, name] of dynamicPages) {
    test(`${name} (${path}) returns < 500 with CSS`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(500);
      const html = await page.content();
      expect(html).toContain('/_next/');
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Previously-missed list pages that exist in the filesystem but were not
//    covered by the main admin-e2e.spec.ts test suite.
// ---------------------------------------------------------------------------

test.describe('Admin Missed List Pages', () => {
  const missedPages: [string, string][] = [
    ['/admin/finance/reports', 'Finance Reports'],
    ['/admin/finance/schemes/kitty', 'Kitty Schemes'],
    ['/admin/finance/schemes/gold-savings', 'Gold Savings Schemes'],
    ['/admin/wholesale/suppliers', 'Suppliers'],
    ['/admin/wholesale/consignments-in', 'Consignments In List'],
    ['/admin/wholesale/consignments-out', 'Consignments Out List'],
    ['/admin/wholesale/goods-receipts', 'Goods Receipts'],
    ['/admin/wholesale/outstanding', 'Outstanding'],
    ['/admin/wholesale/rate-contracts', 'Rate Contracts'],
    ['/admin/ecommerce/click-collect', 'Click & Collect'],
    ['/admin/ecommerce/reviews', 'Reviews'],
  ];

  for (const [path, name] of missedPages) {
    test(`${name} (${path}) returns < 500 with CSS`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(500);
      const html = await page.content();
      expect(html).toContain('/_next/');
    });
  }
});

// ---------------------------------------------------------------------------
// 3. Admin Content Verification -- verify that key section pages render
//    expected text content (not just a 200 status).
// ---------------------------------------------------------------------------

test.describe('Admin Page Content Verification', () => {
  test('Dashboard has stat cards or welcome content', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    // Dashboard should have at least one of these indicators
    const hasDashboardContent =
      body?.includes('Dashboard') ||
      body?.includes('Welcome') ||
      body?.includes('Sales') ||
      body?.includes('Revenue') ||
      body?.includes('Overview');
    expect(hasDashboardContent).toBe(true);
  });

  test('Dashboard renders with stylesheet loaded', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
  });

  test('Inventory page contains "Inventory" text', async ({ page }) => {
    await page.goto('/admin/inventory');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    expect(body).toContain('Inventory');
  });

  test('Inventory page renders with stylesheet', async ({ page }) => {
    await page.goto('/admin/inventory');
    await page.waitForLoadState('networkidle');
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
  });

  test('Manufacturing page contains "Manufacturing" text', async ({ page }) => {
    await page.goto('/admin/manufacturing');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    expect(body).toContain('Manufacturing');
  });

  test('Manufacturing page renders with stylesheet', async ({ page }) => {
    await page.goto('/admin/manufacturing');
    await page.waitForLoadState('networkidle');
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
  });

  test('Retail page contains "Retail" or "POS" text', async ({ page }) => {
    await page.goto('/admin/retail');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    const hasContent = body?.includes('Retail') || body?.includes('POS');
    expect(hasContent).toBe(true);
  });

  test('Retail page renders with stylesheet', async ({ page }) => {
    await page.goto('/admin/retail');
    await page.waitForLoadState('networkidle');
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
  });

  test('Finance page contains "Finance" text', async ({ page }) => {
    await page.goto('/admin/finance');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    expect(body).toContain('Finance');
  });

  test('Finance page renders with stylesheet', async ({ page }) => {
    await page.goto('/admin/finance');
    await page.waitForLoadState('networkidle');
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
  });

  test('CRM page contains "CRM" or "Customer" text', async ({ page }) => {
    await page.goto('/admin/crm');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    const hasContent = body?.includes('CRM') || body?.includes('Customer');
    expect(hasContent).toBe(true);
  });

  test('CRM page renders with stylesheet', async ({ page }) => {
    await page.goto('/admin/crm');
    await page.waitForLoadState('networkidle');
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
  });

  test('Settings page contains "Settings" text', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    expect(body).toContain('Settings');
  });

  test('Settings page renders with stylesheet', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
  });

  test('Reports page contains "Reports" text', async ({ page }) => {
    await page.goto('/admin/reports');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    expect(body).toContain('Report');
  });

  test('Reports page renders with stylesheet', async ({ page }) => {
    await page.goto('/admin/reports');
    await page.waitForLoadState('networkidle');
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
  });

  test('CMS page contains "CMS" or "Content" text', async ({ page }) => {
    await page.goto('/admin/cms');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    const hasContent = body?.includes('CMS') || body?.includes('Content');
    expect(hasContent).toBe(true);
  });

  test('CMS page renders with stylesheet', async ({ page }) => {
    await page.goto('/admin/cms');
    await page.waitForLoadState('networkidle');
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
  });

  test('Compliance page contains "Compliance" or "HUID" text', async ({ page }) => {
    await page.goto('/admin/compliance');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    const hasContent = body?.includes('Compliance') || body?.includes('HUID');
    expect(hasContent).toBe(true);
  });

  test('Compliance page renders with stylesheet', async ({ page }) => {
    await page.goto('/admin/compliance');
    await page.waitForLoadState('networkidle');
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
  });

  test('Wholesale page contains "Wholesale" text', async ({ page }) => {
    await page.goto('/admin/wholesale');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    expect(body).toContain('Wholesale');
  });

  test('Wholesale page renders with stylesheet', async ({ page }) => {
    await page.goto('/admin/wholesale');
    await page.waitForLoadState('networkidle');
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
  });

  test('E-Commerce page contains "Commerce" or "Channel" text', async ({ page }) => {
    await page.goto('/admin/ecommerce');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    const hasContent = body?.includes('Commerce') || body?.includes('Channel') || body?.includes('commerce');
    expect(hasContent).toBe(true);
  });

  test('E-Commerce page renders with stylesheet', async ({ page }) => {
    await page.goto('/admin/ecommerce');
    await page.waitForLoadState('networkidle');
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
  });

  test('Export page contains "Export" text', async ({ page }) => {
    await page.goto('/admin/export');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const body = await page.locator('body').textContent();
    expect(body).toContain('Export');
  });

  test('Export page renders with stylesheet', async ({ page }) => {
    await page.goto('/admin/export');
    await page.waitForLoadState('networkidle');
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);
  });
});
