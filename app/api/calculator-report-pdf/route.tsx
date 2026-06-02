import { NextResponse } from 'next/server';
import { renderCalculatorReportPdf } from '@/lib/email/templates/CalculatorReport.pdf';
import type { CalcResult } from '@/lib/calorieCalculator';
import type { ReportInputs } from '@/lib/email/templates/sections';

export const runtime = 'nodejs';

// Returns the personalized PDF as a download. Used by the wizard to let users
// (and the client team) inspect their report immediately after submitting —
// the report email pipeline still runs separately in /api/calculator-submit.
export async function POST(req: Request) {
  let payload: { name?: unknown; inputs?: ReportInputs; result?: CalcResult } | null;
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  if (
    !payload ||
    typeof payload.name !== 'string' ||
    !payload.name.trim() ||
    !payload.inputs ||
    !payload.result
  ) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  try {
    const pdf = await renderCalculatorReportPdf({
      name:   payload.name,
      inputs: payload.inputs,
      result: payload.result,
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': 'attachment; filename="reporte-entrenaconciencia.pdf"',
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) {
    console.error('[calculator-report-pdf] render failed:', err);
    return NextResponse.json({ ok: false, error: 'render_failed' }, { status: 500 });
  }
}
