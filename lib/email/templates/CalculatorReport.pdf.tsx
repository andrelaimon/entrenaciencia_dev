import { buildReportHtml } from './reportHtml';
import type { ReportProps } from './sections';

export type { ReportProps };

// Vercel sets VERCEL=1 in Lambda. On local dev we use Playwright's bundled
// Chromium; on Vercel we use @sparticuz/chromium + puppeteer-core which ships
// a Lambda-compatible binary extracted to /tmp at runtime.
const IS_LAMBDA = !!process.env.VERCEL;

async function launchBrowser() {
  if (IS_LAMBDA) {
    const [puppeteer, chromium] = await Promise.all([
      import('puppeteer-core'),
      import('@sparticuz/chromium'),
    ]);
    return puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  }

  const { chromium } = await import('playwright');
  return chromium.launch({ headless: true });
}

export async function renderCalculatorReportPdf(props: ReportProps): Promise<Buffer> {
  const html = buildReportHtml(props);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 200));
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
