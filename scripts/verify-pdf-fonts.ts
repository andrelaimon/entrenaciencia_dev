/**
 * Verifies that the calculator PDF embeds the Poppins font family for
 * every weight used in the layout. This is the failure mode that caused
 * iOS PDFKit to fall back to Helvetica and shift the absolute layout.
 *
 * Also writes the generated PDF to /tmp so you can AirDrop it to an iPhone
 * and inspect visually side-by-side with the laptop render.
 *
 *   npm run verify:pdf
 */
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef } from 'pdf-lib';
import { renderCalculatorReportPdf } from '../lib/email/templates/CalculatorReport.pdf';
import type { ReportProps } from '../lib/email/templates/sections';

const SAMPLE: ReportProps = {
  name: 'Andrea',
  inputs: {
    sex: 'female',
    age: 34,
    weight: 68,
    height: 165,
    activity: 1.55,
    goal: 'lose',
    macroSplit: 'balanced',
    proteinLevel: 'standard',
    units: 'metric',
  },
  result: {
    calories: 1680, protein: 126, carbs: 168, fat: 56,
    proteinMin: 110, proteinMax: 140, carbsMin: 150, carbsMax: 190,
    fatMin: 48,  fatMax: 64,
    bmr: 1380, tdee: 2139,
    proteinPct: 0.30, carbsPct: 0.40, fatPct: 0.30,
    warnings: [],
  },
};

const REQUIRED_WEIGHTS = ['ExtraLight', 'Medium', 'Bold', 'ExtraBold'];

function collectFontNames(pdf: PDFDocument): string[] {
  const names = new Set<string>();
  for (const [, obj] of pdf.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue;
    const type = obj.lookup(PDFName.of('Type'));
    if (!(type instanceof PDFName) || type.asString() !== '/Font') continue;
    const base = obj.lookup(PDFName.of('BaseFont'));
    if (base instanceof PDFName) names.add(base.asString());
  }
  return [...names];
}

function assert(cond: boolean, msg: string): void {
  if (!cond) { console.error('✗ FAIL —', msg); process.exitCode = 1; }
  else       { console.log ('✓ PASS —', msg); }
}

(async () => {
  console.log('Generating sample PDF (this takes ~5s for Chromium cold start)…\n');
  const t0 = Date.now();
  const pdfBytes = await renderCalculatorReportPdf(SAMPLE);
  console.log(`Generated ${pdfBytes.length.toLocaleString()} bytes in ${Date.now() - t0}ms\n`);

  const outPath = path.join('/tmp', 'verify-pdf-fonts.pdf');
  fs.writeFileSync(outPath, pdfBytes);
  console.log(`Wrote ${outPath} — open it, AirDrop to iPhone, compare.\n`);

  const pdf = await PDFDocument.load(pdfBytes);
  const fonts = collectFontNames(pdf);
  console.log('Embedded font BaseFont entries:');
  for (const n of fonts) console.log('  ', n);
  console.log();

  assert(fonts.length > 0, 'PDF contains at least one embedded font');

  for (const weight of REQUIRED_WEIGHTS) {
    assert(
      fonts.some(n => n.includes('Poppins') && n.includes(weight)),
      `Poppins-${weight} is embedded (not substituted to a system font)`,
    );
  }

  // PDF subsets are named "AAAAAA+Poppins-Bold" — the 6-letter prefix means
  // Chromium subsetted the font. Subsetting is fine *as long as* every glyph
  // we render is included. If any required weight is missing the prefix and
  // shows as plain "Poppins-Bold", that often means the font was used by
  // reference only and may not render in strict viewers.
  const subsetted = fonts.filter(n => /^\/[A-Z]{6}\+Poppins/.test(n));
  assert(subsetted.length >= REQUIRED_WEIGHTS.length,
    `All ${REQUIRED_WEIGHTS.length} Poppins weights are subset-embedded`);

  assert(pdf.getPageCount() === 1, 'PDF is exactly one page (A4)');

  const page = pdf.getPage(0);
  const { width, height } = page.getSize();
  // A4 at 72dpi = 595.28 × 841.89 pt
  assert(Math.abs(width  - 595.28) < 1, `Page width matches A4 (got ${width.toFixed(2)})`);
  assert(Math.abs(height - 841.89) < 1, `Page height matches A4 (got ${height.toFixed(2)})`);

  console.log('\nDone.');
})().catch(err => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
