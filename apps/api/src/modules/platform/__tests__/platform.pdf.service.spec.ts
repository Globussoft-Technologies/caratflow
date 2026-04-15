import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlatformPdfService } from '../platform.pdf.service';

// ─── Puppeteer mock ────────────────────────────────────────────
// The real puppeteer module is dynamically imported inside the
// service. We register a vitest mock under the bare module name so
// the dynamic import is intercepted.

const mockPdf = vi.fn(async () => Buffer.from('%PDF-1.4\nMOCKED'));
const mockSetContent = vi.fn(async () => undefined);
const mockPageClose = vi.fn(async () => undefined);
const mockBrowserClose = vi.fn(async () => undefined);
const mockNewPage = vi.fn(async () => ({
  setContent: mockSetContent,
  pdf: mockPdf,
  close: mockPageClose,
}));
const mockLaunch = vi.fn(async () => ({
  newPage: mockNewPage,
  close: mockBrowserClose,
}));

vi.mock('puppeteer', () => ({
  default: { launch: mockLaunch },
  launch: mockLaunch,
}));

describe('PlatformPdfService', () => {
  let service: PlatformPdfService;

  beforeEach(() => {
    mockLaunch.mockClear();
    mockNewPage.mockClear();
    mockSetContent.mockClear();
    mockPdf.mockClear();
    mockPageClose.mockClear();
    mockBrowserClose.mockClear();
    service = new PlatformPdfService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('fillTemplate', () => {
    it('substitutes placeholders with data values', () => {
      const out = service.fillTemplate(
        'Hello {{name}}, your total is {{total}}',
        { name: 'Alice', total: '1,234' },
      );
      expect(out).toBe('Hello Alice, your total is 1,234');
    });

    it('replaces unknown placeholders with empty string', () => {
      const out = service.fillTemplate('[{{known}}][{{missing}}]', { known: 'X' });
      expect(out).toBe('[X][]');
    });

    it('handles numeric values', () => {
      const out = service.fillTemplate('{{n}}', { n: 42 });
      expect(out).toBe('42');
    });
  });

  describe('escapeHtml', () => {
    it('escapes dangerous HTML characters', () => {
      expect(service.escapeHtml('<b>&"\'</b>')).toBe(
        '&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;',
      );
    });
  });

  describe('buildTableRows', () => {
    it('produces one tr per record with numbered cells', () => {
      const html = service.buildTableRows(
        [
          { a: 'x', b: 'y' },
          { a: '1', b: '2' },
        ],
        ['a', 'b'],
      );
      expect(html).toContain('<tr><td>1</td><td>x</td><td>y</td></tr>');
      expect(html).toContain('<tr><td>2</td><td>1</td><td>2</td></tr>');
    });

    it('escapes cell contents', () => {
      const html = service.buildTableRows([{ a: '<x>' }], ['a']);
      expect(html).toContain('&lt;x&gt;');
    });
  });

  describe('renderHtmlToPdf', () => {
    it('launches a browser, sets content, and returns the PDF buffer', async () => {
      const buf = await service.renderHtmlToPdf('<p>hi</p>');
      expect(mockLaunch).toHaveBeenCalledOnce();
      expect(mockNewPage).toHaveBeenCalledOnce();
      expect(mockSetContent).toHaveBeenCalledWith('<p>hi</p>', {
        waitUntil: 'networkidle0',
      });
      expect(mockPdf).toHaveBeenCalledOnce();
      const pdfArgs = mockPdf.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
      expect(pdfArgs?.format).toBe('A4');
      expect(pdfArgs?.printBackground).toBe(true);
      expect(buf.toString()).toContain('%PDF');
      expect(mockPageClose).toHaveBeenCalledOnce();
    });

    it('reuses the same browser across multiple renders', async () => {
      await service.renderHtmlToPdf('<p>1</p>');
      await service.renderHtmlToPdf('<p>2</p>');
      await service.renderHtmlToPdf('<p>3</p>');
      expect(mockLaunch).toHaveBeenCalledOnce();
      expect(mockNewPage).toHaveBeenCalledTimes(3);
    });

    it('forwards custom format / landscape options to puppeteer', async () => {
      await service.renderHtmlToPdf('<p>x</p>', {
        format: 'Letter',
        landscape: true,
      });
      const args = mockPdf.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(args.format).toBe('Letter');
      expect(args.landscape).toBe(true);
    });
  });

  describe('renderTemplate', () => {
    it('renders the invoice template with substituted values', async () => {
      const buf = await service.renderTemplate('invoice', {
        invoiceNumber: 'INV-001',
        tenantName: 'Test Jewels',
        lineItemsRows: '<tr><td>1</td></tr>',
      });
      expect(buf.toString()).toContain('%PDF');
      const html = mockSetContent.mock.calls.at(-1)?.[0] as string;
      expect(html).toContain('INV-001');
      expect(html).toContain('Test Jewels');
      expect(html).not.toMatch(/\{\{[a-zA-Z]+\}\}/); // no leftover placeholders
    });

    it('renders the sale-receipt template with 80mm width', async () => {
      await service.renderTemplate('sale-receipt', {
        saleNumber: 'SL-42',
        tenantName: 'POS Store',
      });
      const args = mockPdf.mock.calls.at(-1)?.[0] as Record<string, unknown>;
      expect(args.width).toBe('80mm');
      const html = mockSetContent.mock.calls.at(-1)?.[0] as string;
      expect(html).toContain('SL-42');
    });

    it('renders the label template with 50mm x 30mm page', async () => {
      await service.renderTemplate('label', {
        sku: 'SKU-123',
        huid: 'H999',
      });
      const args = mockPdf.mock.calls.at(-1)?.[0] as Record<string, unknown>;
      expect(args.width).toBe('50mm');
      expect(args.height).toBe('30mm');
      const html = mockSetContent.mock.calls.at(-1)?.[0] as string;
      expect(html).toContain('SKU-123');
      expect(html).toContain('H999');
    });

    it('renders the export-doc template', async () => {
      await service.renderTemplate('export-doc', {
        documentType: 'PACKING LIST',
        documentNumber: 'PL-1',
      });
      const html = mockSetContent.mock.calls.at(-1)?.[0] as string;
      expect(html).toContain('PACKING LIST');
      expect(html).toContain('PL-1');
    });
  });

  describe('onModuleDestroy', () => {
    it('closes the browser when called after a render', async () => {
      await service.renderHtmlToPdf('<p>x</p>');
      await service.onModuleDestroy();
      expect(mockBrowserClose).toHaveBeenCalledOnce();
    });

    it('is a no-op when no browser was launched', async () => {
      await service.onModuleDestroy();
      expect(mockBrowserClose).not.toHaveBeenCalled();
    });
  });
});

// ─── Light integration check ──────────────────────────────────
// Starts from the same mocked module but verifies the bytes we
// return look like a PDF (the mock returns the "%PDF-" header).
describe('PlatformPdfService integration (mocked)', () => {
  it('returns a buffer whose bytes start with the PDF magic number', async () => {
    const service = new PlatformPdfService();
    try {
      const buf = await service.renderTemplate('invoice', {
        invoiceNumber: 'INV-INT-1',
      });
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.slice(0, 5).toString()).toBe('%PDF-');
    } finally {
      await service.onModuleDestroy();
    }
  });
});
