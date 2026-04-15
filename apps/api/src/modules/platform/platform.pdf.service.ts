// ─── Platform PDF Service ──────────────────────────────────────
// Real PDF generation via headless Chromium (puppeteer).
//
// Notes:
//  • Puppeteer is loaded via dynamic import so that unit tests can
//    mock it without requiring the Chromium binary, and so that the
//    TypeScript build stays clean even when puppeteer is not yet
//    installed (e.g. CI environments where we only lint/type-check).
//  • A single browser instance is cached at module scope and reused
//    across requests. It is closed on NestJS shutdown (onModuleDestroy).
//  • On Linux we optionally use PUPPETEER_EXECUTABLE_PATH to point at
//    a system-installed chromium (smaller Docker images). On Windows
//    we rely on the chromium bundled with puppeteer.

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// We intentionally keep puppeteer as loose `unknown` types here.
// The real type surface is only needed inside the launcher.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PuppeteerBrowser = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PuppeteerPage = any;

export type PdfTemplateName =
  | 'invoice'
  | 'sale-receipt'
  | 'label'
  | 'export-doc';

export interface RenderOptions {
  format?: 'A4' | 'A5' | 'Letter' | 'Legal';
  landscape?: boolean;
  printBackground?: boolean;
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  width?: string;
  height?: string;
}

const DEFAULT_OPTIONS: RenderOptions = {
  format: 'A4',
  printBackground: true,
  margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
};

@Injectable()
export class PlatformPdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PlatformPdfService.name);
  private browserPromise: Promise<PuppeteerBrowser> | null = null;

  // ─── Browser lifecycle ─────────────────────────────────────────

  /**
   * Lazy-launches and caches a single Chromium instance.
   * Subsequent calls reuse the same browser.
   */
  private async getBrowser(): Promise<PuppeteerBrowser> {
    if (this.browserPromise) return this.browserPromise;

    this.browserPromise = (async () => {
      // Dynamic import so vitest mocks can intercept and so tsc doesn't
      // require puppeteer's types at compile time. We hide the specifier
      // behind a variable so TypeScript's module resolver does not try
      // to locate `puppeteer` at build time (the package may only be
      // present in production containers).
      const specifier: string = 'puppeteer';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await (import(specifier) as Promise<any>).catch((err) => {
        this.logger.error(
          'puppeteer is not installed. Run `pnpm add puppeteer` inside apps/api.',
          err as Error,
        );
        throw new InternalServerErrorException(
          'PDF generation not available: puppeteer module missing',
        );
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const launchOpts: Record<string, any> = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--font-render-hinting=none',
        ],
      };

      // Allow pointing at a system chromium on Linux (smaller images).
      const execPath = process.env.PUPPETEER_EXECUTABLE_PATH;
      if (execPath && process.platform !== 'win32') {
        launchOpts.executablePath = execPath;
      }

      this.logger.log(`Launching headless Chromium (${process.platform})`);
      const browser = await (mod.default ?? mod).launch(launchOpts);
      return browser as PuppeteerBrowser;
    })();

    try {
      return await this.browserPromise;
    } catch (err) {
      this.browserPromise = null;
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.browserPromise) return;
    try {
      const browser = await this.browserPromise;
      await browser.close();
      this.logger.log('Headless Chromium closed');
    } catch (err) {
      this.logger.warn(`Error closing browser: ${(err as Error).message}`);
    } finally {
      this.browserPromise = null;
    }
  }

  // ─── Core rendering ────────────────────────────────────────────

  /**
   * Render arbitrary HTML to a PDF buffer using the cached browser.
   */
  async renderHtmlToPdf(html: string, options: RenderOptions = {}): Promise<Buffer> {
    const opts: RenderOptions = { ...DEFAULT_OPTIONS, ...options };
    const browser = await this.getBrowser();
    const page: PuppeteerPage = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: opts.format,
        landscape: opts.landscape,
        printBackground: opts.printBackground,
        margin: opts.margin,
        width: opts.width,
        height: opts.height,
      });
      // puppeteer returns Uint8Array; normalize to Buffer.
      return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
    } finally {
      try {
        await page.close();
      } catch {
        /* swallow */
      }
    }
  }

  /**
   * Render a named HTML template with simple `{{key}}` substitution.
   * Unknown placeholders are replaced with an empty string so the
   * output never contains raw `{{…}}` tokens.
   */
  async renderTemplate(
    templateName: PdfTemplateName,
    data: Record<string, unknown>,
    options?: RenderOptions,
  ): Promise<Buffer> {
    const html = this.loadAndFillTemplate(templateName, data);
    // Labels use a custom page size.
    if (templateName === 'label') {
      return this.renderHtmlToPdf(html, {
        ...options,
        width: '50mm',
        height: '30mm',
        margin: { top: '1mm', right: '1mm', bottom: '1mm', left: '1mm' },
      });
    }
    if (templateName === 'sale-receipt') {
      return this.renderHtmlToPdf(html, {
        ...options,
        width: '80mm',
        height: '297mm',
        margin: { top: '4mm', right: '4mm', bottom: '4mm', left: '4mm' },
      });
    }
    return this.renderHtmlToPdf(html, options);
  }

  // ─── Template loading / substitution (exposed for tests) ───────

  loadAndFillTemplate(
    templateName: PdfTemplateName,
    data: Record<string, unknown>,
  ): string {
    const raw = this.readTemplate(templateName);
    return this.fillTemplate(raw, data);
  }

  fillTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
      const val = data[key];
      if (val === null || val === undefined) return '';
      return String(val);
    });
  }

  private readTemplate(name: PdfTemplateName): string {
    // Check dist/src/... first (compiled), fall back to src.
    const candidates = [
      path.join(__dirname, 'pdf-templates', `${name}.html`),
      path.join(
        process.cwd(),
        'apps',
        'api',
        'src',
        'modules',
        'platform',
        'pdf-templates',
        `${name}.html`,
      ),
      path.join(
        process.cwd(),
        'src',
        'modules',
        'platform',
        'pdf-templates',
        `${name}.html`,
      ),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
    }
    throw new NotFoundException(`PDF template not found: ${name}`);
  }

  // ─── Utility helpers used by callers ───────────────────────────

  /**
   * Build HTML `<tr>` rows for a simple record list.
   * `columns` specifies the keys (in order) to render per row.
   */
  buildTableRows(
    records: ReadonlyArray<Record<string, unknown>>,
    columns: readonly string[],
  ): string {
    return records
      .map((rec, i) => {
        const cells = [`<td>${i + 1}</td>`, ...columns.map((c) => {
          const v = rec[c];
          const safe = v === null || v === undefined ? '' : String(v);
          return `<td>${this.escapeHtml(safe)}</td>`;
        })];
        return `<tr>${cells.join('')}</tr>`;
      })
      .join('\n');
  }

  escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
