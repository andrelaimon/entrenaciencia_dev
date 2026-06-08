import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import CalculatorReportEmail from '@/lib/email/templates/CalculatorReport.email';
import { renderCalculatorReportPdf } from '@/lib/email/templates/CalculatorReport.pdf';
import { renderCalculatorReportPdfV2 } from '@/lib/email/templates/CalculatorReport.pdf.v2';
import { renderCalculatorReportPdfMaster } from '@/lib/email/templates/CalculatorReport.pdf.master';
import { calculateCalories, type CalcWarning } from '@/lib/calorieCalculator';
import type { ReportProps, ReportInputs } from '@/lib/email/templates/sections';

export const runtime = 'nodejs';

// Dev-only preview route. Disabled in production.
// Usage:
//   /api/preview-report                          → HTML email (default)
//   /api/preview-report?format=pdf               → PDF (current shipped template)
//   /api/preview-report?format=pdf&version=v2    → PDF v2 (designer-mockup port)
//   /api/preview-report?warn=carbo_bajo,…        → exercise warning blocks
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PREVIEW_ROUTE) {
    return NextResponse.json({ ok: false, error: 'disabled_in_production' }, { status: 404 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get('format') ?? 'html';
  const warnParam = url.searchParams.get('warn');
  const warnings = (warnParam ? warnParam.split(',') : []) as CalcWarning[];
  // `?preg=1` exercises the pregnancy/lactation callout. Loss is blocked during
  // pregnancy, so fall back to maintain for the preview.
  const preg = url.searchParams.get('preg') === '1';

  const inputs: ReportInputs = {
    sex:          'female',
    age:          35,
    weight:       70,
    height:       165,
    activity:     1.55,
    goal:         preg ? 'maintain' : 'loss',
    macroSplit:   'balanced',
    proteinLevel: 'high',
    units:        'metric',
    pregnancyLactation: preg,
  };

  // Compute the result with the real engine so the preview reflects production.
  const calc = calculateCalories({
    sex: inputs.sex, age: inputs.age, weight: inputs.weight, height: inputs.height,
    activity: inputs.activity, goal: inputs.goal, macroSplit: inputs.macroSplit,
    proteinLevel: inputs.proteinLevel,
  });
  if ('blocked' in calc) {
    return NextResponse.json({ ok: false, error: 'blocked', warning: calc.warning }, { status: 422 });
  }

  // `?warn=` overrides warnings to exercise the warning blocks.
  const props: ReportProps = {
    name: 'Andrea',
    inputs,
    result: warnings.length ? { ...calc, warnings } : calc,
  };

  if (format === 'pdf') {
    const version = url.searchParams.get('version') ?? 'v1';
    const renderPdf =
      version === 'master' ? renderCalculatorReportPdfMaster :
      version === 'v2'     ? renderCalculatorReportPdfV2 :
                             renderCalculatorReportPdf;
    const pdf = await renderPdf(props);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `inline; filename="reporte-preview-${version}.pdf"`,
        'Cache-Control':       'no-store',
      },
    });
  }

  const html = await render(<CalculatorReportEmail {...props} baseUrl={url.origin} />);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
