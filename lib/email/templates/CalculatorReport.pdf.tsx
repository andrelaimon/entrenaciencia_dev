import { chromium } from 'playwright';
import { buildReportHtml } from './reportHtml';
import type { ReportProps } from './sections';

export type { ReportProps };

export async function renderCalculatorReportPdf(props: ReportProps): Promise<Buffer> {
  const html = buildReportHtml(props);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    // Give fonts a tick to finish loading from the embedded base64 data URIs
    await page.waitForTimeout(200);
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
