import { Resend } from 'resend';
import { render } from '@react-email/render';
import CalculatorReportEmail from './templates/CalculatorReport.email';
import ResourceGuideEmail from './templates/ResourceGuide.email';
import { renderCalculatorReportPdf } from './templates/CalculatorReport.pdf';
import type { ReportProps } from './templates/sections';

// Map resource title (as sent by the modal via `source`) → filename in Supabase Storage bucket "guides"
const RESOURCE_PDF_MAP: Record<string, string> = {
  'Pierde Grasa con Ciencia': 'pierde-grasa-con-ciencia.pdf',
  'Proteína con Ciencia':     'proteina-con-ciencia.pdf',
};

function guideDownloadUrl(filename: string): string | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/guides/${filename}`;
}

const FROM_DEFAULT = 'Entrena con Ciencia <reportes@entrenaciencia.com>';

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

interface ResourceGuideArgs {
  to: string;
  name: string;
  guideTitle: string;
}

export async function sendResourceGuide(args: ResourceGuideArgs): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping resource guide send');
    return { sent: false, reason: 'no_api_key' };
  }

  const pdfFilename = RESOURCE_PDF_MAP[args.guideTitle];
  if (!pdfFilename) {
    console.warn(`[email] No PDF mapped for resource: "${args.guideTitle}"`);
    return { sent: false, reason: 'no_pdf_mapped' };
  }

  const downloadUrl = guideDownloadUrl(pdfFilename);
  if (!downloadUrl) {
    console.warn('[email] SUPABASE_URL not set — cannot build guide download URL');
    return { sent: false, reason: 'no_supabase_url' };
  }

  const from = process.env.EMAIL_FROM || FROM_DEFAULT;
  const replyTo = process.env.EMAIL_REPLY_TO;
  const props = { name: args.name, guideTitle: args.guideTitle, downloadUrl };

  try {
    const [html, text] = await Promise.all([
      render(<ResourceGuideEmail {...props} />),
      render(<ResourceGuideEmail {...props} />, { plainText: true }),
    ]);

    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from,
      to: args.to,
      ...(replyTo ? { replyTo } : {}),
      subject: `Aquí está tu guía: ${args.guideTitle}`,
      html,
      text,
    });

    if (response.error) {
      console.error('[email] resend error:', response.error);
      return { sent: false, reason: response.error.message };
    }
    return { sent: true, id: response.data?.id };
  } catch (err) {
    console.error('[email] resource guide send threw:', err);
    return { sent: false, reason: err instanceof Error ? err.message : 'unknown' };
  }
}
