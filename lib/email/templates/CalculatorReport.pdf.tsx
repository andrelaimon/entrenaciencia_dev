import { PDFDocument } from 'pdf-lib';
import { buildReportHtml } from './reportHtml';
import type { ReportProps } from './sections';

export type { ReportProps };

// Vercel sets VERCEL=1 in Lambda. On local dev we use Playwright's bundled
// Chromium; on Vercel we use @sparticuz/chromium + puppeteer-core which ships
// a Lambda-compatible binary extracted to /tmp at runtime.
const IS_LAMBDA = !!process.env.VERCEL;

// Disable font hinting so glyph metrics match what we positioned against in
// the HTML. Without this, some PDF viewers shift baselines.
const FONT_ARGS = ['--font-render-hinting=none'];

// A4 dimensions used by both the screenshot viewport and the wrapping PDF.
const A4_WIDTH_PX  = 794;     // 210mm @ 96dpi
const A4_HEIGHT_PX = 1123;    // 297mm @ 96dpi
const A4_WIDTH_PT  = 595.28;  // 210mm @ 72dpi
const A4_HEIGHT_PT = 841.89;  // 297mm @ 72dpi
// 2x for a crisp render. 3x is sharper but ~doubles the PNG size.
const DEVICE_SCALE = 2;

async function launchBrowser() {
  if (IS_LAMBDA) {
    const [puppeteer, chromium] = await Promise.all([
      import('puppeteer-core'),
      import('@sparticuz/chromium'),
    ]);
    return {
      kind: 'puppeteer' as const,
      browser: await puppeteer.default.launch({
        args: [...chromium.default.args, ...FONT_ARGS],
        executablePath: await chromium.default.executablePath(),
        headless: true,
      }),
    };
  }

  const { chromium } = await import('playwright');
  return {
    kind: 'playwright' as const,
    browser: await chromium.launch({ headless: true, args: FONT_ARGS }),
  };
}

/**
 * Renders the report HTML, rasterizes it to a high-DPI PNG, then wraps the
 * PNG into a single A4 PDF page.
 *
 * Why rasterize instead of letting Chromium emit a vector PDF? iOS PDFKit
 * (Safari, Files, Quick Look) misrenders CSS transforms and some font-metric
 * edge cases on text emitted from headless Chrome, causing every
 * absolutely-positioned label to drift out of its box. macOS Preview is fine,
 * Windows is fine. Rasterizing flattens everything to pixels so the report
 * looks identical on every device.
 *
 * Trade-off: text isn't selectable. The PDF is for end-user consumption, not
 * data extraction, so this is acceptable.
 */
export async function renderCalculatorReportPdf(props: ReportProps): Promise<Buffer> {
  const html = buildReportHtml(props);
  const launched = await launchBrowser();
  const { browser } = launched;

  try {
    const viewport = { width: A4_WIDTH_PX, height: A4_HEIGHT_PX };
    let png: Uint8Array;

    if (launched.kind === 'playwright') {
      const context = await browser.newContext({ viewport, deviceScaleFactor: DEVICE_SCALE });
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      png = await page.screenshot({ type: 'png', fullPage: false, omitBackground: false });
    } else {
      const page = await browser.newPage();
      await page.setViewport({ ...viewport, deviceScaleFactor: DEVICE_SCALE });
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      png = await page.screenshot({ type: 'png', fullPage: false, omitBackground: false });
    }

    const pdfDoc = await PDFDocument.create();
    const image = await pdfDoc.embedPng(png);
    const pdfPage = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    pdfPage.drawImage(image, { x: 0, y: 0, width: A4_WIDTH_PT, height: A4_HEIGHT_PT });
    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  } finally {
    await browser.close();
  }
}

export default renderCalculatorReportPdf;
