import { Resend } from 'resend';
import { render } from '@react-email/render';
import CalculatorReportEmail from './templates/CalculatorReport.email';
import { renderCalculatorReportPdf } from './templates/CalculatorReport.pdf';
import type { ReportProps } from './templates/sections';

const FROM_DEFAULT = 'Entrena con Ciencia <reportes@entrenaconciencia.com>';

interface SendArgs extends ReportProps {
  to: string;
}

interface SendResult {
  sent: boolean;
  id?: string;
  reason?: string;
}

export async function sendCalculatorReport(args: SendArgs): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping send');
    return { sent: false, reason: 'no_api_key' };
  }

  const from = process.env.EMAIL_FROM || FROM_DEFAULT;
  const replyTo = process.env.EMAIL_REPLY_TO;

  const { to, name, inputs, result } = args;
  const props = { name, inputs, result };

  try {
    const [html, text, pdfBuffer] = await Promise.all([
      render(<CalculatorReportEmail {...props} />),
      render(<CalculatorReportEmail {...props} />, { plainText: true }),
      renderCalculatorReportPdf(props),
    ]);

    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from,
      to,
      ...(replyTo ? { replyTo } : {}),
      subject: `Tu reporte personalizado: ${result.calories} kcal/día`,
      html,
      text,
      attachments: [
        {
          filename: 'reporte-entrenaconciencia.pdf',
          content: pdfBuffer,
        },
      ],
    });

    if (response.error) {
      console.error('[email] resend error:', response.error);
      return { sent: false, reason: response.error.message };
    }
    return { sent: true, id: response.data?.id };
  } catch (err) {
    console.error('[email] send threw:', err);
    return { sent: false, reason: err instanceof Error ? err.message : 'unknown' };
  }
}
