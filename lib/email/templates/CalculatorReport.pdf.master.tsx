/**
 * Master-PDF overlay renderer.
 *
 * Uses the designer's final PDF (`calculadora_assets/calculadora_output_master.pdf`)
 * as a fixed background and overlays only the dynamic text values via pdf-lib.
 * Each placeholder declares its bounding box and style; we cover the existing
 * sample text with a rectangle in the right background color and redraw the
 * new text on top.
 *
 * Coordinates are in pdftotext space (origin top-left, y growing down) — we
 * convert to pdf-lib space (origin bottom-left) at draw time.
 *
 * To add / move a placeholder, find its bbox by running:
 *   pdftotext -bbox-layout calculadora_assets/calculadora_output_master.pdf /tmp/bbox.html
 * and copying the xMin/yMin/xMax/yMax of the line you want to replace.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, type PDFFont, type RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {
  goalLabels,
  WEEKLY_GOAL_PCT,
  goalAdjustment,
  macroSplitLabels,
  activityLabels,
  type Goal,
} from '@/lib/calorieCalculator';
import type { ReportProps } from './sections';

let masterBytes: Buffer | null = null;
try {
  masterBytes = fs.readFileSync(
    path.join(process.cwd(), 'calculadora_assets', 'calculadora_output_master.pdf'),
  );
} catch (err) {
  console.warn('[pdf-master] could not load calculadora_output_master.pdf:', err);
}

const FONT_DIR = path.join(process.cwd(), 'lib', 'email', 'fonts');
function loadFont(name: string): Buffer | null {
  try { return fs.readFileSync(path.join(FONT_DIR, name)); }
  catch (err) { console.warn(`[pdf-master] could not load ${name}:`, err); return null; }
}
const poppinsExtraLight = loadFont('Poppins-ExtraLight.ttf');
const poppinsMedium     = loadFont('Poppins-Medium.ttf');
const poppinsBold       = loadFont('Poppins-Bold.ttf');
const poppinsExtraBold  = loadFont('Poppins-ExtraBold.ttf');

/* ───────────────────────────── colors ───────────────────────────── */
// pdf-lib uses 0..1 rgb. Mirror our brand palette.
const C = {
  navy:      rgb(0.004, 0.047, 0.082),
  cyan:      rgb(0.137, 0.827, 1),
  cyanSoft:  rgb(0.533, 0.945, 1),
  yellow:    rgb(1.0,   0.765, 0),
  teal:      rgb(0.004, 0.498, 0.655),
  mint:      rgb(0.612, 0.886, 0.714),
  white:     rgb(1, 1, 1),
  textDark:  rgb(0.10,  0.10,  0.10),
  textMuted: rgb(0.45,  0.45,  0.45),
} as const;

// The designer's body card has a very subtle light-blue gradient; pure white
// cover rects pop out against it. This off-white tint blends much better.
const BODY_BG = rgb(0.955, 0.965, 0.975);

type ColorKey = keyof typeof C;
type Bg = 'white' | 'navy';
type Align = 'left' | 'center' | 'right';
/** Maps to the four Poppins weights the designer used. */
type Weight = 'extralight' | 'medium' | 'bold' | 'extrabold';

interface Placeholder {
  id: string;
  /** Bbox of the master's sample text in pdftotext coords. */
  x: number; y: number; w: number; h: number;
  /** Background color the placeholder sits on — we draw a cover rect in it. */
  bg: Bg;
  fontSize: number;
  weight?: Weight;
  color: ColorKey;
  align?: Align;
  value: (p: ReportProps) => string;
  /** Extra horizontal padding around the cover rect (pt). */
  padX?: number;
  /** Extra padding below the bbox (handles descender bleed). Default 2. */
  padBottom?: number;
  /** Extra padding above the bbox. Default 0 — extending upward usually clips
   *  cyan labels sitting just above the value row. */
  padTop?: number;
}

/* ────────────────────── derived value helpers ─────────────────────── */

const fmt = (n: number) => Math.round(n).toLocaleString('es-MX');

function goalDescription(goal: Goal): string {
  // Strip the parenthetical "(0.70%/semana)" and the "— ritmo X" suffix so the
  // sentence in the goal pill stays close to the designer's original length.
  return goalLabels[goal]
    .title
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s*—\s*ritmo\s+\S+\s*$/i, '')
    .toLowerCase();
}

function goalRateText(goal: Goal): string {
  const pct = WEEKLY_GOAL_PCT[goal];
  if (pct === 0) return '';
  return `${(Math.abs(pct) * 100).toFixed(2)}% por semana`;
}

function dateLabel(): string {
  return new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
}

function integerPercents(parts: [number, number, number]): [number, number, number] {
  const raw = parts.map((p) => p * 100);
  const floor = raw.map(Math.floor);
  const remainder = 100 - floor.reduce((s, x) => s + x, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floor];
  for (let k = 0; k < remainder && k < order.length; k++) out[order[k].i] += 1;
  return out as [number, number, number];
}

function pctInts(p: ReportProps): [number, number, number] {
  return integerPercents([p.result.proteinPct, p.result.carbsPct, p.result.fatPct]);
}

/* ───────────────────────── placeholder map ────────────────────────── */
//
// Bboxes were extracted with:
//   pdftotext -bbox-layout lib/email/templates/master.pdf /tmp/bbox.html
//
// Cover rectangles get a small padding (padX/padY) to fully hide the
// sample text underneath. Page is 595 × 842 pt.

const PLACEHOLDERS: Placeholder[] = [
  // ── Hero ──────────────────────────────────────────────────────────
  {
    id: 'date',
    x: 181, y: 151, w: 214, h: 18,
    bg: 'navy', fontSize: 11, color: 'cyanSoft', align: 'center',
    value: () => `Generado el ${dateLabel()}`,
  },

  // ── Greeting (only the name part) ────────────────────────────────
  // Designer has "Hola, Andrea." entire phrase as one line. We overwrite the
  // whole thing because we don't know exactly where "Andrea." starts.
  {
    id: 'greeting',
    x: 70, y: 207, w: 86, h: 18, padX: 1,
    bg: 'white', fontSize: 14, weight: 'extrabold', color: 'yellow', align: 'left',
    value: (p) => `Hola, ${p.name}.`,
  },

  // ── Goal pill (two halves: description + rate) ───────────────────
  {
    id: 'goal_desc',
    x: 75, y: 237, w: 319, h: 14, padX: 1,
    bg: 'white', fontSize: 10, color: 'textDark', align: 'left',
    value: (p) => `Esto es lo que calculamos para tu objetivo de ${goalDescription(p.inputs.goal)}`,
  },
  {
    id: 'goal_rate',
    x: 424, y: 237, w: 82, h: 14, padX: 1,
    bg: 'white', fontSize: 10, weight: 'extrabold', color: 'yellow', align: 'left',
    value: (p) => goalRateText(p.inputs.goal) || '—',
  },

  // ── Donut centre ─────────────────────────────────────────────────
  {
    id: 'donut_calories',
    x: 151, y: 298, w: 38, h: 22, padX: 1,
    bg: 'white', fontSize: 18, weight: 'extrabold', color: 'navy', align: 'center',
    value: (p) => fmt(p.result.calories),
  },

  // ── Macro rows (grams + %) ───────────────────────────────────────
  {
    id: 'prot_g',  x: 378, y: 279, w: 26, h: 14, padX: 1,
    bg: 'white', fontSize: 11, weight: 'bold', color: 'yellow', align: 'left',
    value: (p) => `${p.result.protein} g`,
  },
  {
    id: 'prot_pct', x: 430, y: 279, w: 22, h: 14, padX: 1,
    bg: 'white', fontSize: 10, color: 'textMuted', align: 'left',
    value: (p) => `${pctInts(p)[0]}%`,
  },
  {
    id: 'carb_g',  x: 378, y: 307, w: 28, h: 14, padX: 1,
    bg: 'white', fontSize: 11, weight: 'bold', color: 'yellow', align: 'left',
    value: (p) => `${p.result.carbs} g`,
  },
  {
    id: 'carb_pct', x: 430, y: 307, w: 22, h: 14, padX: 1,
    bg: 'white', fontSize: 10, color: 'textMuted', align: 'left',
    value: (p) => `${pctInts(p)[1]}%`,
  },
  {
    id: 'fat_g',   x: 378, y: 335, w: 24, h: 14, padX: 1,
    bg: 'white', fontSize: 11, weight: 'bold', color: 'yellow', align: 'left',
    value: (p) => `${p.result.fat} g`,
  },
  {
    id: 'fat_pct',  x: 430, y: 335, w: 22, h: 14, padX: 1,
    bg: 'white', fontSize: 10, color: 'textMuted', align: 'left',
    value: (p) => `${pctInts(p)[2]}%`,
  },

  // ── Calorías diarias callout (Cómo calculamos) ───────────────────
  {
    id: 'cal_diarias',
    x: 376, y: 417, w: 40, h: 24, padX: 1,
    bg: 'white', fontSize: 18, weight: 'extrabold', color: 'navy', align: 'center',
    value: (p) => fmt(p.result.calories),
  },

  // ── Hex tiles: TDEE + Ajuste ─────────────────────────────────────
  {
    id: 'tdee',
    x: 145, y: 472, w: 26, h: 14, padX: 1,
    bg: 'white', fontSize: 12, weight: 'bold', color: 'navy', align: 'center',
    value: (p) => fmt(p.result.tdee),
  },
  {
    id: 'adjust',
    x: 247, y: 472, w: 20, h: 14, padX: 1,
    bg: 'white', fontSize: 12, weight: 'bold', color: 'navy', align: 'center',
    value: (p) => fmt(Math.abs(goalAdjustment(p.inputs.weight, p.inputs.goal))),
  },

  // ── Tus datos (3-col grid) ───────────────────────────────────────
  {
    id: 'sexo',
    x: 86, y: 545, w: 130, h: 14, padX: 1,
    bg: 'white', fontSize: 11, weight: 'bold', color: 'navy', align: 'left',
    value: (p) => (p.inputs.sex === 'male' ? 'Masculino' : 'Femenino'),
  },
  {
    id: 'edad',
    x: 219, y: 545, w: 130, h: 14, padX: 1,
    bg: 'white', fontSize: 11, weight: 'bold', color: 'navy', align: 'left',
    value: (p) => `${p.inputs.age} años`,
  },
  // Objetivo spans 2 lines in the master. We overwrite both with one wrap.
  // The cover boxes extend further right because the new text (with the rate
  // descriptor) is wider than the original "Pérdida de peso -" sample.
  {
    id: 'objetivo_l1',
    x: 364, y: 545, w: 110, h: 14, padX: 1,
    bg: 'white', fontSize: 11, weight: 'bold', color: 'navy', align: 'left',
    value: (p) => {
      // Mirror the designer: short base goal name on line 1 with a trailing dash,
      // rate ("0.70% por semana") on line 2 — written by objetivo_l2.
      const base = goalLabels[p.inputs.goal].title
        .replace(/\s*\([^)]*\)\s*$/, '')
        .replace(/\s*—\s*ritmo\s+\S+\s*$/i, '');
      return `${base} —`;
    },
  },
  {
    id: 'objetivo_l2',
    x: 364, y: 557, w: 110, h: 14, padX: 1,
    bg: 'white', fontSize: 11, weight: 'bold', color: 'navy', align: 'left',
    value: (p) => goalRateText(p.inputs.goal) || 'sin ajuste',
  },
  {
    id: 'peso',
    x: 86, y: 575, w: 130, h: 14, padX: 1,
    bg: 'white', fontSize: 11, weight: 'bold', color: 'navy', align: 'left',
    value: (p) => {
      const lb = (p.inputs.weight / 0.45359237).toFixed(0);
      return p.inputs.units === 'imperial' ? `${lb} lb` : `${p.inputs.weight} kg`;
    },
  },
  {
    id: 'reparto',
    x: 219, y: 575, w: 200, h: 14, padX: 1,
    bg: 'white', fontSize: 11, weight: 'bold', color: 'navy', align: 'left',
    value: (p) => macroSplitLabels[p.inputs.macroSplit].title,
  },
  {
    id: 'talla',
    x: 86, y: 602, w: 130, h: 14, padX: 1,
    bg: 'white', fontSize: 11, weight: 'bold', color: 'navy', align: 'left',
    value: (p) => {
      const inches = (p.inputs.height / 2.54).toFixed(0);
      return p.inputs.units === 'imperial' ? `${inches} in` : `${p.inputs.height} cm`;
    },
  },
  {
    id: 'actividad',
    x: 219, y: 602, w: 200, h: 14, padX: 1,
    bg: 'white', fontSize: 11, weight: 'bold', color: 'navy', align: 'left',
    value: (p) => activityLabels[p.inputs.activity].title,
  },
];

/* ───────────────────────────── renderer ───────────────────────────── */

export async function renderCalculatorReportPdfMaster(props: ReportProps): Promise<Buffer> {
  if (!masterBytes) {
    throw new Error('[pdf-master] master.pdf is not loaded — check lib/email/templates/master.pdf');
  }

  const pdf = await PDFDocument.load(masterBytes);
  pdf.registerFontkit(fontkit);
  const page = pdf.getPages()[0];
  const pageH = page.getHeight();

  // Match the designer: Poppins (ExtraLight / Medium / Bold / ExtraBold).
  // If a weight file is missing we silently fall back to Medium so the route
  // doesn't fail outright.
  const fontMedium    = poppinsMedium     ? await pdf.embedFont(poppinsMedium)     : null;
  const fontBold      = poppinsBold       ? await pdf.embedFont(poppinsBold)       : fontMedium;
  const fontExtraBold = poppinsExtraBold  ? await pdf.embedFont(poppinsExtraBold)  : fontBold;
  const fontExtraLight= poppinsExtraLight ? await pdf.embedFont(poppinsExtraLight) : fontMedium;

  const fonts: Record<Weight, PDFFont | null> = {
    extralight: fontExtraLight,
    medium:     fontMedium,
    bold:       fontBold,
    extrabold:  fontExtraBold,
  };

  for (const ph of PLACEHOLDERS) {
    drawPlaceholder(page, pageH, ph, props, fonts);
  }

  const out = await pdf.save();
  return Buffer.from(out);
}

function bgColor(bg: Bg): RGB {
  return bg === 'navy' ? C.navy : BODY_BG;
}

function drawPlaceholder(
  page: ReturnType<PDFDocument['getPages']>[0],
  pageH: number,
  ph: Placeholder,
  props: ReportProps,
  fonts: Record<Weight, PDFFont | null>,
) {
  const text = ph.value(props);
  if (!text) return;
  const font = fonts[ph.weight ?? 'medium'] ?? fonts.medium;
  if (!font) {
    console.warn(`[pdf-master] no font available for placeholder ${ph.id}; skipping`);
    return;
  }
  const padX = ph.padX ?? 3;
  const padBottom = ph.padBottom ?? 2;
  const padTop = ph.padTop ?? 0;

  // Cover the sample text with a rectangle in the background color. Pad below
  // by default; never extend above the bbox unless padTop is explicit so we
  // don't eat into cyan labels sitting on the row immediately above.
  page.drawRectangle({
    x: ph.x - padX,
    y: pageH - (ph.y + ph.h) - padBottom,
    width: ph.w + padX * 2,
    height: ph.h + padBottom + padTop,
    color: bgColor(ph.bg),
  });

  // Measure and place new text.
  const width = font.widthOfTextAtSize(text, ph.fontSize);
  let drawX = ph.x;
  if (ph.align === 'center') drawX = ph.x + (ph.w - width) / 2;
  else if (ph.align === 'right') drawX = ph.x + ph.w - width;

  // Place the baseline at top-of-bbox + font ascent (the real ascent reported
  // by the embedded TTF), so the new glyphs sit exactly where the designer's
  // sample sat — independent of how loose pdftotext's bbox height was.
  const ascent = font.heightAtSize(ph.fontSize, { descender: false });
  const baselineY = pageH - ph.y - ascent;

  page.drawText(text, {
    x: drawX,
    y: baselineY,
    size: ph.fontSize,
    font,
    color: C[ph.color],
  });
}

export default renderCalculatorReportPdfMaster;
