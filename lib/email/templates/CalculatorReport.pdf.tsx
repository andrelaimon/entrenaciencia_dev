import { buildReportHtml } from './reportHtml';
import type { ReportProps } from './sections';

export type { ReportProps };

// Vercel sets VERCEL=1 in Lambda. On local dev we use Playwright's bundled
// Chromium; on Vercel we use @sparticuz/chromium + puppeteer-core which ships
// a Lambda-compatible binary extracted to /tmp at runtime.
const IS_LAMBDA = !!process.env.VERCEL;

// Disable font hinting so glyph metrics match what we positioned against in
// the HTML. Without this, some PDF viewers (notably Apple PDFKit on iOS)
// shift baselines and break the absolutely-positioned layout.
const FONT_ARGS = ['--font-render-hinting=none'];

async function launchBrowser() {
  if (IS_LAMBDA) {
    const [puppeteer, chromium] = await Promise.all([
      import('puppeteer-core'),
      import('@sparticuz/chromium'),
    ]);
    return puppeteer.default.launch({
      args: [...chromium.default.args, ...FONT_ARGS],
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  }

  const { chromium } = await import('playwright');
  return chromium.launch({ headless: true, args: FONT_ARGS });
}

export async function renderCalculatorReportPdf(props: ReportProps): Promise<Buffer> {
  const html = buildReportHtml(props);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    // Wait for the network to settle so the data-URL @font-face declarations
    // have all been parsed, then explicitly await document.fonts.ready so
    // Chromium snapshots with the real Poppins metrics — otherwise the
    // embedded font subset is incomplete and iOS PDF viewers fall back to
    // Helvetica, shifting every absolutely-positioned text node.
    // (puppeteer-core uses 'networkidle0'; playwright uses 'networkidle'.)
    const waitUntil = IS_LAMBDA ? 'networkidle0' : 'networkidle';
    await page.setContent(html, { waitUntil: waitUntil as never });
    await page.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready);
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export default renderCalculatorReportPdf;
