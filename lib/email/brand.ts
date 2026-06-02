// Brand tokens shared between the HTML email and the PDF report.
// Mirrors app/globals.css so the email/PDF look like extensions of the site.

export const COLORS = {
  navy:      '#010d15',
  navy2:     '#0a2540',
  navyTop:   '#011a2a',
  teal:      '#017FA7',
  cyan:      '#23D3FF',
  cyanSoft:  '#88F1FF',
  yellow:    '#FFC300',
  yellowHi:  '#FFDC6B',
  mint:      '#9CE2B6',
  white:     '#ffffff',
  offwhite:  '#f4f9fb',
  textDark:  '#1a1a1a',
  textMuted: '#5a6a76',
  warnBg:    '#fff7e0',
  warnBar:   '#FFC300',
  dangerBg:  '#ffe5e5',
  dangerBar: '#EF4444',
} as const;

export const FONT_STACK = 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://entrenaconciencia.com';

// Course-waitlist CTA target — same anchor the landing "Inscribirme" card scrolls to.
export const COURSE_CTA_URL = `${SITE_URL}/#recursos`;

// Hex clipPath used across the site for icon badges.
export const HEX_CLIP_PATH = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';
