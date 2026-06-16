/**
 * Verifies the calculator PDF. Since we now rasterize the report to a PNG
 * and wrap it in a PDF (to dodge iOS PDFKit's broken text rendering), the
 * checks are: the PDF has one A4 page, that page contains one image, and
 * the image is large enough to be a real high-DPI render (not a thumbnail
 * or fallback).
 *
 * Also writes /tmp/verify-pdf-fonts.pdf so the same artifact can be
 * AirDropped to an iPhone for visual comparison with desktop.
 *
 *   npm run verify:pdf
 */
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, PDFName, PDFDict, PDFRawStream } from 'pdf-lib';
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
    goal: 'loss',
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

interface EmbeddedImage { width: number; height: number; bytes: number }

function collectImages(pdf: PDFDocument): EmbeddedImage[] {
  const images: EmbeddedImage[] = [];
  for (const [, obj] of pdf.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    const type    = dict.lookup(PDFName.of('Type'));
    const subtype = dict.lookup(PDFName.of('Subtype'));
    if (!(type    instanceof PDFName) || type.asString()    !== '/XObject') continue;
    if (!(subtype instanceof PDFName) || subtype.asString() !== '/Image')   continue;
    const w = dict.lookup(PDFName.of('Width'));
    const h = dict.lookup(PDFName.of('Height'));
    images.push({
      width:  (w as { numberValue?: number })?.numberValue ?? 0,
      height: (h as { numberValue?: number })?.numberValue ?? 0,
      bytes:  obj.contents.length,
    });
  }
  return images;
}

function assert(cond: boolean, msg: string): void {
  if (!cond) { console.error('✗ FAIL —', msg); process.exitCode = 1; }
  else       { console.log ('✓ PASS —', msg); }
}

(async () => {
  console.log('Generating sample PDF (rasterized, ~5–10s)…\n');
  const t0 = Date.now();
  const pdfBytes = await renderCalculatorReportPdf(SAMPLE);
  console.log(`Generated ${pdfBytes.length.toLocaleString()} bytes in ${Date.now() - t0}ms\n`);

  const outPath = path.join('/tmp', 'verify-pdf-fonts.pdf');
  fs.writeFileSync(outPath, pdfBytes);
  console.log(`Wrote ${outPath} — open it, AirDrop to iPhone, compare.\n`);

  const pdf = await PDFDocument.load(pdfBytes);
  const images = collectImages(pdf);
  console.log('Embedded images:');
  for (const i of images) {
    console.log(`   ${i.width}×${i.height} px, ${i.bytes.toLocaleString()} bytes`);
  }
  console.log();

  assert(pdf.getPageCount() === 1, 'PDF is exactly one page');

  const page = pdf.getPage(0);
  const { width, height } = page.getSize();
  assert(Math.abs(width  - 595.28) < 1, `Page width matches A4 (got ${width.toFixed(2)})`);
  assert(Math.abs(height - 841.89) < 1, `Page height matches A4 (got ${height.toFixed(2)})`);

  assert(images.length === 1, `Page contains exactly one rasterized image (found ${images.length})`);

  if (images.length > 0) {
    const img = images[0];
    // 2x device scale × 794 px viewport = 1588 px wide. Allow generous slack
    // for Chromium version differences.
    assert(img.width  >= 1400, `Image width is at least 1400px (got ${img.width}) — confirms high-DPI render`);
    assert(img.height >= 2000, `Image height is at least 2000px (got ${img.height}) — confirms full A4 capture`);
    assert(img.bytes  >= 50_000, `Image payload is non-trivial (got ${img.bytes.toLocaleString()} bytes)`);
  }

  // No embedded fonts is expected for a rasterized PDF — that's the whole point.
  // If we ever regress and Chromium's vector pipeline sneaks back in, fonts
  // would reappear. So we assert their absence.
  let fontCount = 0;
  for (const [, obj] of pdf.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue;
    const type = obj.lookup(PDFName.of('Type'));
    if (type instanceof PDFName && type.asString() === '/Font') fontCount++;
  }
  assert(fontCount === 0, `No fonts embedded (rasterized output, got ${fontCount})`);

  // The yellow "Inscríbete al Curso" CTA must remain clickable. Rasterization
  // strips <a> semantics from the source HTML; we re-add a Link annotation in
  // pdf-lib. Verify it actually got added and points at the right URL.
  const linkUris: string[] = [];
  for (const [, obj] of pdf.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue;
    const subtype = obj.lookup(PDFName.of('Subtype'));
    if (!(subtype instanceof PDFName) || subtype.asString() !== '/Link') continue;
    const action = obj.lookup(PDFName.of('A'));
    if (!(action instanceof PDFDict)) continue;
    const uri = action.lookup(PDFName.of('URI'));
    // PDFString surface varies across pdf-lib versions; coerce.
    linkUris.push(String((uri as { decodeText?: () => string })?.decodeText?.() ?? uri ?? ''));
  }
  console.log('Link annotations:');
  for (const u of linkUris) console.log('  ', u);
  console.log();

  assert(linkUris.length >= 1, 'PDF contains at least one Link annotation');
  assert(
    linkUris.some(u => u.includes('entrenaciencia.com') && u.includes('#recursos')),
    'CTA link points to entrenaciencia.com#recursos',
  );

  console.log('\nDone.');
})().catch(err => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
