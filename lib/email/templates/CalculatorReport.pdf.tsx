import { PDFDocument, PDFName, PDFString, PDFArray } from 'pdf-lib';
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

// px (96dpi) → pt (72dpi) for mapping CTA rectangles into PDF space.
const PX_TO_PT = A4_WIDTH_PT / A4_WIDTH_PX;

interface CtaRect { x: number; y: number; w: number; h: number; href: string }

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

// Runs inside the page. Returns each [data-cta] element's viewport rect + href.
function readCtaRects(): CtaRect[] {
  const out: CtaRect[] = [];
  for (const el of document.querySelectorAll<HTMLAnchorElement>('a[data-cta]')) {
    const r = el.getBoundingClientRect();
    if (!el.href || r.width <= 0 || r.height <= 0) continue;
    out.push({ x: r.x, y: r.y, w: r.width, h: r.height, href: el.href });
  }
  return out;
}

function addLinkAnnotations(
  pdfDoc: PDFDocument,
  pdfPage: ReturnType<PDFDocument['addPage']>,
  rects: CtaRect[],
): void {
  if (rects.length === 0) return;
  const annots = rects.map(({ x, y, w, h, href }) => {
    const llx = x * PX_TO_PT;
    const urx = (x + w) * PX_TO_PT;
    // PDF origin is bottom-left; viewport origin is top-left.
    const ury = A4_HEIGHT_PT - y * PX_TO_PT;
    const lly = A4_HEIGHT_PT - (y + h) * PX_TO_PT;
    return pdfDoc.context.register(
      pdfDoc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [llx, lly, urx, ury],
        Border: [0, 0, 0],
        A: { Type: 'Action', S: 'URI', URI: PDFString.of(href) },
      }),
    );
  });
  pdfPage.node.set(PDFName.of('Annots'), PDFArray.withContext(pdfDoc.context));
  const arr = pdfPage.node.get(PDFName.of('Annots')) as PDFArray;
  for (const a of annots) arr.push(a);
}

/**
 * Renders the report HTML, rasterizes it to a high-DPI PNG, then wraps the
 * PNG into a single A4 PDF page. After embedding the image, re-creates link
 * annotations for any [data-cta] anchor in the source HTML so the yellow
 * CTA button stays clickable in the final PDF — the screenshot itself can't
 * preserve <a> semantics.
 *
 * Why rasterize? iOS PDFKit (Safari, Files, Quick Look) misrenders CSS
 * transforms and some font-metric edge cases on text emitted from headless
 * Chrome, causing every absolutely-positioned label to drift out of its box.
 * macOS Preview is fine, Windows is fine. Rasterizing flattens everything to
 * pixels so the report looks identical on every device.
 *
 * Trade-off: text isn't selectable. The PDF is for end-user consumption, not
 * data extraction, so this is acceptable.
 */
export async function renderCalculatorReportPdf(props: ReportProps): Promise<Buffer> {
  const html = buildReportHtml(props);
  const launched = await launchBrowser();

  try {
    const viewport = { width: A4_WIDTH_PX, height: A4_HEIGHT_PX };
    let png: Uint8Array;
    let ctaRects: CtaRect[];

    if (launched.kind === 'playwright') {
      const context = await launched.browser.newContext({ viewport, deviceScaleFactor: DEVICE_SCALE });
      const page = await context.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      ctaRects = await page.evaluate(readCtaRects);
      png = await page.screenshot({ type: 'png', fullPage: false, omitBackground: false });
    } else {
      // puppeteer-core types aren't installed in dev (it's a Vercel-only
      // runtime dep), so cast through unknown to keep typecheck clean.
      const page = await (launched.browser as unknown as {
        newPage: () => Promise<{
          setViewport: (v: { width: number; height: number; deviceScaleFactor: number }) => Promise<void>;
          setContent: (h: string, o: { waitUntil: string }) => Promise<void>;
          evaluate: <T>(fn: () => T) => Promise<T>;
          screenshot: (o: { type: 'png'; fullPage: boolean; omitBackground: boolean }) => Promise<Uint8Array>;
        }>;
      }).newPage();
      await page.setViewport({ ...viewport, deviceScaleFactor: DEVICE_SCALE });
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready);
      ctaRects = await page.evaluate(readCtaRects);
      png = await page.screenshot({ type: 'png', fullPage: false, omitBackground: false });
    }

    const pdfDoc = await PDFDocument.create();
    const image = await pdfDoc.embedPng(png);
    const pdfPage = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    pdfPage.drawImage(image, { x: 0, y: 0, width: A4_WIDTH_PT, height: A4_HEIGHT_PT });
    addLinkAnnotations(pdfDoc, pdfPage, ctaRects);
    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  } finally {
    await launched.browser.close();
  }
}

export default renderCalculatorReportPdf;
