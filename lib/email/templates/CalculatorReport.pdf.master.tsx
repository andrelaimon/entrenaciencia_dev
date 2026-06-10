/**
 * Master-PDF overlay renderer.
 *
 * Uses the designer's final PDF (`calculadora_assets/calculadora_output_master.pdf`)
 * as a fixed background and overlays only the dynamic text values via pdf-lib.
 *
 * Each placeholder declares its bounding box, the exact background color sampled
 * from the master PDF at that position (so the cover rect blends into the gradient
 * instead of sitting on top of it), and the text style to draw.
 *
 * Coordinates are in pdftotext space (origin top-left, y growing down) — we
 * convert to pdf-lib space (origin bottom-left) at draw time.
 *
 * To re-sample background colors or find bboxes, render the master at 150 DPI:
 *   pdftoppm -r 150 -png calculadora_assets/calculadora_output_master.pdf /tmp/master
 * then use Pillow to read pixel values at the desired point (scale = 150/72).
 *
 * To find bboxes for new placeholders:
 *   pdftotext -bbox-layout calculadora_assets/calculadora_output_master.pdf /tmp/bbox.html
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

/* ───────────────────────────── text colors ─────────────────────────── */
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

/* ── Per-placeholder background colors ──────────────────────────────────
 * Sampled from the master PDF rendered at 150 DPI using Pillow, at a point
 * just outside the original text glyphs so we read true background, not
 * anti-aliased text pixels.  Each value is stable for a given master PDF;
 * re-run the sampling script in the file header comment if the master changes.
 */
const BG = {
  header:     rgb(0.004, 0.290, 0.396), // teal gradient at date row  (x=288,y=160)
  cardNearWh: rgb(0.973, 0.984, 0.988), // card body, left column     (x=170,y=213)
  pill:       rgb(1.000, 1.000, 1.000), // goal pill interior          (x=72, y=244)
  donut:      rgb(0.965, 0.980, 0.984), // donut hole                  (x=198,y=309)
  macroG:     rgb(0.929, 0.961, 0.969), // macro gram column           (x=370,y=286)
  macroPct:   rgb(0.910, 0.949, 0.957), // macro % column              (x=455,y=286)
  calBox:     rgb(0.969, 0.984, 0.984), // calorías diarias box        (x=374,y=429)
  tdee:       rgb(0.980, 0.988, 0.988), // TDEE tile                   (x=138,y=479)
  adjust:     rgb(0.957, 0.976, 0.980), // Ajuste tile                 (x=240,y=479)
  dataLeft:   rgb(0.992, 0.996, 0.996), // Tus datos left col          (x=78, y=551)
  dataMid:    rgb(0.965, 0.980, 0.984), // Tus datos mid col labels    (x=210,y=551)
  reparto:    rgb(0.945, 0.969, 0.976), // reparto value area mid      (x=285,y=582)
  actividad:  rgb(0.937, 0.965, 0.969), // actividad value area mid    (x=335,y=609)
  dataRight:  rgb(0.933, 0.961, 0.969), // Tus datos right col (obj.)  (x=358,y=551)
} as const;

type ColorKey = keyof typeof C;
type Align = 'left' | 'center' | 'right';
type Weight = 'extralight' | 'medium' | 'bold' | 'extrabold';

interface Placeholder {
  id: string;
  /** Bbox of the master's sample text in pdftotext coords (top-left origin). */
  x: number; y: number; w: number; h: number;
  /** Exact background color sampled from the master PDF at this location.
   *  Set to null to skip the cover rect (use when the background gradient can't
   *  be matched with a flat color and the new text overlaps the original). */
  bgRgb: RGB | null;
  fontSize: number;
  weight?: Weight;
  color: ColorKey;
  align?: Align;
  value: (p: ReportProps) => string;
}

/* ────────────────────── derived value helpers ─────────────────────── */

const fmt = (n: number) => Math.round(n).toLocaleString('es-MX');

function goalDescription(goal: Goal): string {
  return goalLabels[goal]
    .title
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s*—\s*ritmo\s+\S+\s*$/i, '')
    .toLowerCase();
}

function goalRateText(goal: Goal, weightKg: number): string {
  const pct = WEEKLY_GOAL_PCT[goal];
  if (pct === 0) return '';
  const kgPerWeek = Math.abs(pct * weightKg);
  return `${kgPerWeek.toFixed(1)} kg/semana`;
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

const PLACEHOLDERS: Placeholder[] = [
  // ── Hero ──────────────────────────────────────────────────────────
  {
    id: 'date',
    x: 181, y: 151, w: 214, h: 18, bgRgb: BG.header,
    fontSize: 11, color: 'cyanSoft', align: 'center',
    value: () => `Generado el ${dateLabel()}`,
  },

  // ── Greeting ─────────────────────────────────────────────────────
  {
    id: 'greeting',
    x: 70, y: 207, w: 86, h: 18, bgRgb: BG.cardNearWh,
    fontSize: 14, weight: 'extrabold', color: 'yellow', align: 'left',
    value: (p) => `Hola, ${p.name}.`,
  },

  // ── Goal pill ────────────────────────────────────────────────────
  // The pill is transparent — no fill, just a teal border over the card gradient.
  // The gradient shifts from white (left) to rgb(234,243,245) at the right edge,
  // so no flat cover rect can match it. Skip the rect and let the new text
  // paint directly over the original (text is nearly identical so overlap hides it).
  {
    id: 'goal_desc',
    x: 75, y: 237, w: 319, h: 14, bgRgb: null,
    fontSize: 10, color: 'teal', align: 'left',
    value: (p) => `Esto es lo que calculamos para tu objetivo de ${goalDescription(p.inputs.goal)}`,
  },
  {
    id: 'goal_rate',
    x: 424, y: 237, w: 82, h: 14, bgRgb: null,
    fontSize: 10, weight: 'extrabold', color: 'yellow', align: 'left',
    value: (p) => goalRateText(p.inputs.goal, p.inputs.weight) || '—',
  },

  // ── Donut centre ─────────────────────────────────────────────────
  {
    id: 'donut_calories',
    x: 151, y: 298, w: 38, h: 22, bgRgb: BG.donut,
    fontSize: 18, weight: 'extrabold', color: 'teal', align: 'center',
    value: (p) => fmt(p.result.calories),
  },

  // ── Macro rows (grams + %) ───────────────────────────────────────
  { id: 'prot_g',   x: 378, y: 279, w: 26, h: 14, bgRgb: BG.macroG,
    fontSize: 11, weight: 'bold', color: 'teal', align: 'left',
    value: (p) => `${p.result.protein} g` },
  { id: 'prot_pct', x: 430, y: 279, w: 22, h: 14, bgRgb: BG.macroPct,
    fontSize: 10, color: 'teal', align: 'left',
    value: (p) => `${pctInts(p)[0]}%` },
  { id: 'carb_g',   x: 378, y: 307, w: 28, h: 14, bgRgb: BG.macroG,
    fontSize: 11, weight: 'bold', color: 'teal', align: 'left',
    value: (p) => `${p.result.carbs} g` },
  { id: 'carb_pct', x: 430, y: 307, w: 22, h: 14, bgRgb: BG.macroPct,
    fontSize: 10, color: 'teal', align: 'left',
    value: (p) => `${pctInts(p)[1]}%` },
  { id: 'fat_g',    x: 378, y: 335, w: 24, h: 14, bgRgb: BG.macroG,
    fontSize: 11, weight: 'bold', color: 'teal', align: 'left',
    value: (p) => `${p.result.fat} g` },
  { id: 'fat_pct',  x: 430, y: 335, w: 22, h: 14, bgRgb: BG.macroPct,
    fontSize: 10, color: 'teal', align: 'left',
    value: (p) => `${pctInts(p)[2]}%` },

  // ── Calorías diarias callout ──────────────────────────────────────
  {
    id: 'cal_diarias',
    x: 376, y: 417, w: 40, h: 24, bgRgb: BG.calBox,
    fontSize: 18, weight: 'extrabold', color: 'teal', align: 'center',
    value: (p) => fmt(p.result.calories),
  },

  // ── Hex tiles: TDEE + Ajuste ─────────────────────────────────────
  {
    id: 'tdee',
    x: 145, y: 472, w: 26, h: 14, bgRgb: BG.tdee,
    fontSize: 12, weight: 'bold', color: 'teal', align: 'center',
    value: (p) => fmt(p.result.tdee),
  },
  {
    id: 'adjust',
    x: 247, y: 472, w: 20, h: 14, bgRgb: BG.adjust,
    fontSize: 12, weight: 'bold', color: 'teal', align: 'center',
    value: (p) => fmt(Math.abs(goalAdjustment(p.inputs.weight, p.inputs.goal))),
  },

  // ── Tus datos (3-col grid) ───────────────────────────────────────
  // Widths are sized to the longest possible value + 4 pt buffer, not the full
  // column width, so the cover rect doesn't leave a visible band past the text.
  { id: 'sexo',
    x: 86, y: 545, w: 65, h: 14, bgRgb: BG.dataLeft,    // "Masculino" ≈ 55 pt
    fontSize: 11, weight: 'bold', color: 'teal', align: 'left',
    value: (p) => (p.inputs.sex === 'male' ? 'Masculino' : 'Femenino') },
  { id: 'edad',
    x: 219, y: 545, w: 52, h: 14, bgRgb: BG.dataMid,    // "80 años" ≈ 44 pt
    fontSize: 11, weight: 'bold', color: 'teal', align: 'left',
    value: (p) => `${p.inputs.age} años` },
  { id: 'objetivo_l1',
    x: 364, y: 545, w: 100, h: 14, bgRgb: BG.dataRight, // "Pérdida de peso —" ≈ 95 pt
    fontSize: 11, weight: 'bold', color: 'teal', align: 'left',
    value: (p) => {
      const base = goalLabels[p.inputs.goal].title
        .replace(/\s*\([^)]*\)\s*$/, '')
        .replace(/\s*—\s*ritmo\s+\S+\s*$/i, '');
      return `${base} —`;
    } },
  { id: 'objetivo_l2',
    x: 364, y: 557, w: 85, h: 14, bgRgb: BG.dataRight,  // "0.5 kg/semana" ≈ 78 pt
    fontSize: 11, weight: 'bold', color: 'teal', align: 'left',
    value: (p) => goalRateText(p.inputs.goal, p.inputs.weight) || 'sin ajuste' },
  { id: 'peso',
    x: 86, y: 575, w: 52, h: 14, bgRgb: BG.dataLeft,    // "300 kg" ≈ 42 pt
    fontSize: 11, weight: 'bold', color: 'teal', align: 'left',
    value: (p) => {
      const lb = (p.inputs.weight / 0.45359237).toFixed(0);
      return p.inputs.units === 'imperial' ? `${lb} lb` : `${p.inputs.weight} kg`;
    } },
  { id: 'reparto',
    x: 219, y: 575, w: 135, h: 14, bgRgb: BG.reparto,   // "Bajo en carbohidratos" ≈ 125 pt
    fontSize: 11, weight: 'bold', color: 'teal', align: 'left',
    value: (p) => macroSplitLabels[p.inputs.macroSplit].title },
  { id: 'talla',
    x: 86, y: 602, w: 52, h: 14, bgRgb: BG.dataLeft,    // "230 cm" ≈ 45 pt
    fontSize: 11, weight: 'bold', color: 'teal', align: 'left',
    value: (p) => {
      const inches = (p.inputs.height / 2.54).toFixed(0);
      return p.inputs.units === 'imperial' ? `${inches} in` : `${p.inputs.height} cm`;
    } },
  { id: 'actividad',
    x: 219, y: 602, w: 135, h: 14, bgRgb: BG.actividad, // "Moderadamente activo" ≈ 125 pt
    fontSize: 11, weight: 'bold', color: 'teal', align: 'left',
    value: (p) => activityLabels[p.inputs.activity].title },
];

/* ───────────────────────────── renderer ───────────────────────────── */

export async function renderCalculatorReportPdfMaster(props: ReportProps): Promise<Buffer> {
  if (!masterBytes) {
    throw new Error('[pdf-master] master.pdf is not loaded — check calculadora_assets/calculadora_output_master.pdf');
  }

  const pdf = await PDFDocument.load(masterBytes);
  pdf.setTitle('Reporte de Calorías — Entrena con Ciencia');
  pdf.registerFontkit(fontkit);
  const page = pdf.getPages()[0];
  const pageH = page.getHeight();

  const fontMedium     = poppinsMedium     ? await pdf.embedFont(poppinsMedium)     : null;
  const fontBold       = poppinsBold       ? await pdf.embedFont(poppinsBold)       : fontMedium;
  const fontExtraBold  = poppinsExtraBold  ? await pdf.embedFont(poppinsExtraBold)  : fontBold;
  const fontExtraLight = poppinsExtraLight ? await pdf.embedFont(poppinsExtraLight) : fontMedium;

  const fonts: Record<Weight, PDFFont | null> = {
    extralight: fontExtraLight,
    medium:     fontMedium,
    bold:       fontBold,
    extrabold:  fontExtraBold,
  };

  // ── Goal pill cover ───────────────────────────────────────────────
  // The pill has no fill — it's a transparent border over the card gradient.
  // Three segments approximate the gradient (white→rgb(238,245,247)) well enough
  // to be invisible while fully hiding the original sample text underneath.
  const pillY = pageH - 251.935 - 2;
  const pillH = 16;
  for (const [x, w, color] of [
    [73,  130, rgb(0.992, 0.996, 0.996)] as const,  // near-white left
    [203, 150, rgb(0.973, 0.984, 0.988)] as const,  // mid
    [353, 162, rgb(0.933, 0.961, 0.969)] as const,  // more saturated right
  ]) {
    page.drawRectangle({ x, y: pillY, width: w, height: pillH, color });
  }

  for (const ph of PLACEHOLDERS) {
    drawPlaceholder(page, pageH, ph, props, fonts);
  }

  const out = await pdf.save();
  return Buffer.from(out);
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

  // Cover the original sample text (skip when bgRgb is null — gradient background
  // that can't be matched with a flat color; new text overlaps original instead).
  if (ph.bgRgb !== null) {
    page.drawRectangle({
      x: ph.x - 2,
      y: pageH - (ph.y + ph.h) - 2,
      width: ph.w + 4,
      height: ph.h + 2,
      color: ph.bgRgb,
    });
  }

  // Measure and align the new text within the placeholder bbox.
  const width = font.widthOfTextAtSize(text, ph.fontSize);
  let drawX = ph.x;
  if (ph.align === 'center') drawX = ph.x + (ph.w - width) / 2;
  else if (ph.align === 'right') drawX = ph.x + ph.w - width;

  // Baseline placement: top-of-bbox minus the font's real ascent so glyphs
  // sit at the same vertical position as the designer's original sample text.
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
