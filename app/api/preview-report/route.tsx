import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import CalculatorReportEmail from '@/lib/email/templates/CalculatorReport.email';
import { renderCalculatorReportPdf } from '@/lib/email/templates/CalculatorReport.pdf';
import type { CalcWarning } from '@/lib/calorieCalculator';
import type { ReportProps } from '@/lib/email/templates/sections';

export const runtime = 'nodejs';

// Dev-only preview route. Disabled in production.
// Usage:
//   /api/preview-report                 → HTML email (default)
//   /api/preview-report?format=pdf      → PDF
//   /api/preview-report?warn=deficit_limitado,supervision_medica
//                                       → exercise warning blocks
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PREVIEW_ROUTE) {
    return NextResponse.json({ ok: false, error: 'disabled_in_production' }, { status: 404 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get('format') ?? 'html';
  const warnParam = url.searchParams.get('warn');
  const warnings = (warnParam ? warnParam.split(',') : []) as CalcWarning[];

  const props: ReportProps = {
    name: 'Andrea',
    inputs: {
      sex:        'female',
      age:        35,
      weight:     70,
      height:     165,
      activity:   1.55,
      goal:       'loss',
      macroSplit: 'balanced',
      units:      'metric',
    },
    result: {
      calories:   1613,
      protein:    112,
      carbs:      180,
      fat:        49,
      bmr:        1395,
      tdee:       2163,
      proteinPct: 0.278,
      carbsPct:   0.447,
      fatPct:     0.275,
      warnings,
    },
  };

  if (format === 'pdf') {
    const pdf = await renderCalculatorReportPdf(props);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'inline; filename="reporte-preview.pdf"',
        'Cache-Control':       'no-store',
      },
    });
  }

  const html = await render(<CalculatorReportEmail {...props} />);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
