import fs from 'node:fs';
import path from 'node:path';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Svg,
  Path,
  Circle,
  Defs,
  RadialGradient,
  Stop,
  Rect,
  renderToBuffer,
} from '@react-pdf/renderer';
import { COLORS } from '../brand';
import {
  CALIBRATION_MESSAGE,
  WARNING_COPY,
  goalAdjustmentLabel,
  inputsSummary,
  macroRows,
  pctLabel,
  type ReportProps,
} from './sections';
import { goalLabels } from '@/lib/calorieCalculator';

// Load the isotipo once at module init.
let isotipoBuffer: Buffer | null = null;
try {
  isotipoBuffer = fs.readFileSync(path.join(process.cwd(), 'public', 'images', 'isotipo-cyan.png'));
} catch (err) {
  console.warn('[pdf] could not load isotipo-cyan.png:', err);
}

/* ─────────────────────────── Donut chart ─────────────────────────── */

function describeArc(cx: number, cy: number, r: number, startA: number, endA: number): string {
  const x1 = cx + r * Math.cos(startA);
  const y1 = cy + r * Math.sin(startA);
  const x2 = cx + r * Math.cos(endA);
  const y2 = cy + r * Math.sin(endA);
  const largeArc = endA - startA > Math.PI ? 1 : 0;
  return `M ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`;
}

interface DonutSegment { value: number; color: string }

function DonutChart({ segments, size, thickness }: { segments: DonutSegment[]; size: number; thickness: number }) {
  const r  = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const gap = 0.015; // small radian gap between segments for crispness

  let cursor = -Math.PI / 2; // start at 12 o'clock
  const arcs = segments.map((s, i) => {
    const sweep = (s.value / total) * (2 * Math.PI);
    const start = cursor + gap / 2;
    const end   = cursor + sweep - gap / 2;
    cursor += sweep;
    if (sweep <= gap * 2) return null;
    return (
      <Path
        key={i}
        d={describeArc(cx, cy, r, start, end)}
        stroke={s.color}
        strokeWidth={thickness}
        strokeLinecap="butt"
        fill="none"
      />
    );
  });

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke="#eef3f6" strokeWidth={thickness} fill="none" />
      {arcs}
    </Svg>
  );
}

/* ────────────────────────────── Styles ────────────────────────────── */
// A4 = 595 × 842 pt. Layout is tuned to fit on a single page.

const HERO_HEIGHT = 132;
const PAGE_WIDTH  = 595;

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
  },

  /* Hero */
  hero: {
    backgroundColor: COLORS.navy,
    height: HERO_HEIGHT,
    paddingHorizontal: 36,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  isotipo: { width: 40, height: 40, marginBottom: 8 },
  eyebrow: {
    color: COLORS.cyan,
    fontSize: 8,
    letterSpacing: 2.5,
    fontFamily: 'Helvetica-Bold',
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.4,
    marginTop: 8,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    marginTop: 4,
  },

  /* Body */
  body: { paddingHorizontal: 40, paddingTop: 20, paddingBottom: 18 },

  greeting: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.navy },
  lead: { fontSize: 10, lineHeight: 1.45, color: COLORS.textDark, marginTop: 2, marginBottom: 16 },

  /* Donut row */
  donutRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  donutWrap: { width: 130, height: 130, position: 'relative', marginRight: 22 },
  donutCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  donutCalLabel: { fontSize: 7, letterSpacing: 1.5, color: COLORS.textMuted, fontFamily: 'Helvetica-Bold' },
  donutCalValue: { fontSize: 22, color: COLORS.navy, fontFamily: 'Helvetica-Bold', marginTop: 1, marginBottom: 1 },
  donutCalUnit:  { fontSize: 8, color: COLORS.textMuted },

  legend: { flex: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomStyle: 'solid', borderBottomColor: '#e3eaef' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendName: { fontSize: 10, color: COLORS.textDark, fontFamily: 'Helvetica-Bold', flex: 1 },
  legendGrams: { fontSize: 11, color: COLORS.navy, fontFamily: 'Helvetica-Bold', marginRight: 8 },
  legendUnit: { fontSize: 8, color: COLORS.textMuted },
  legendPct: { fontSize: 9, color: COLORS.textMuted, width: 32, textAlign: 'right' },

  /* Section heading — editorial, with cyan accent line */
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionAccent: { width: 14, height: 2, backgroundColor: COLORS.cyan, marginRight: 8 },
  sectionLabel: { fontSize: 8, letterSpacing: 2, color: COLORS.teal, fontFamily: 'Helvetica-Bold' },

  /* Breakdown — flow with arrows between steps */
  breakdown: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  bStep: { alignItems: 'center', flex: 1 },
  bStepFinal: { alignItems: 'center', flex: 1, backgroundColor: COLORS.navy, borderRadius: 6, paddingVertical: 6 },
  bArrow: { fontSize: 12, color: COLORS.textMuted, marginHorizontal: 2 },
  bLabel:        { fontSize: 7,  letterSpacing: 1, color: COLORS.textMuted, fontFamily: 'Helvetica-Bold' },
  bLabelFinal:   { fontSize: 7,  letterSpacing: 1, color: COLORS.cyanSoft, fontFamily: 'Helvetica-Bold' },
  bValue:        { fontSize: 11, color: COLORS.textDark, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  bValueFinal:   { fontSize: 13, color: COLORS.cyan,     fontFamily: 'Helvetica-Bold', marginTop: 2 },
  bUnit:         { fontSize: 7,  color: COLORS.textMuted, marginTop: 1 },
  bUnitFinal:    { fontSize: 7,  color: COLORS.cyanSoft,  marginTop: 1 },

  /* Recap — 2-col, with hairline divider */
  recap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  recapItem: { width: '50%', flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomStyle: 'solid', borderBottomColor: '#eef3f6' },
  recapLabel: { fontSize: 9,  color: COLORS.textMuted, width: '55%' },
  recapValue: { fontSize: 9,  color: COLORS.textDark, fontFamily: 'Helvetica-Bold', flex: 1 },

  /* Warnings */
  warning: { borderRadius: 4, padding: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftStyle: 'solid' },
  warningTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  warningBody: { fontSize: 8.5, lineHeight: 1.4, color: COLORS.textDark },

  calibration: { fontSize: 8.5, fontStyle: 'italic', color: COLORS.textMuted, lineHeight: 1.45, marginBottom: 12, marginTop: 2 },

  /* CTA — yellow pill button like the landing primary */
  ctaWrap: { alignItems: 'center', marginBottom: 10 },
  ctaPill: {
    backgroundColor: COLORS.yellow,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 26,
    alignItems: 'center',
  },
  ctaTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.navy, letterSpacing: 0.3 },
  ctaSub:   { fontSize: 8, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },

  footerDivider: { height: 0.5, backgroundColor: '#e3eaef', marginVertical: 6 },
  footer: { fontSize: 7.5, color: COLORS.textMuted, lineHeight: 1.4, textAlign: 'center' },
  footerBrand: { fontSize: 8, color: COLORS.teal, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 3 },
});

/* ─────────────────────────────── Document ─────────────────────────────── */

function CalculatorReportDocument({ name, inputs, result }: ReportProps) {
  const goalTitle = goalLabels[inputs.goal].title;
  const dateLabel = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  const macros = macroRows(result);
  const recap  = inputsSummary(inputs);

  return (
    <Document title="Reporte personalizado — Entrena con Ciencia" author="Entrena con Ciencia">
      <Page size="A4" style={s.page}>
        {/* Hero with SVG radial glow — mirrors the landing's radial-gradient hero */}
        <View style={s.hero}>
          <Svg style={s.heroBg} width={PAGE_WIDTH} height={HERO_HEIGHT}>
            <Defs>
              <RadialGradient id="heroGlow" cx="50%" cy="0%" r="65%">
                <Stop offset="0%"  stopColor={COLORS.teal} stopOpacity={0.55} />
                <Stop offset="60%" stopColor={COLORS.navy} stopOpacity={0} />
                <Stop offset="100%" stopColor={COLORS.navy} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={PAGE_WIDTH} height={HERO_HEIGHT} fill="url(#heroGlow)" />
          </Svg>
          <View style={s.heroContent}>
            {isotipoBuffer && <Image style={s.isotipo} src={isotipoBuffer} />}
            <Text style={s.eyebrow}>ENTRENA CON CIENCIA</Text>
            <Text style={s.heroTitle}>Tu reporte personalizado</Text>
            <Text style={s.heroSub}>Generado el {dateLabel} · Mifflin-St Jeor</Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.greeting}>Hola, {name} —</Text>
          <Text style={s.lead}>
            Esto es lo que calculamos para tu objetivo de {goalTitle.toLowerCase()}.
          </Text>

          {/* Donut + macro legend */}
          <View style={s.donutRow}>
            <View style={s.donutWrap}>
              <DonutChart
                segments={macros.map((m) => ({ value: m.pct, color: m.color }))}
                size={130}
                thickness={18}
              />
              <View style={s.donutCenter}>
                <Text style={s.donutCalLabel}>KCAL/DÍA</Text>
                <Text style={s.donutCalValue}>{result.calories.toLocaleString('es-MX')}</Text>
                <Text style={s.donutCalUnit}>objetivo</Text>
              </View>
            </View>

            <View style={s.legend}>
              {macros.map((m) => (
                <View key={m.label} style={s.legendRow}>
                  <View style={[s.legendDot, { backgroundColor: m.color }]} />
                  <Text style={s.legendName}>{m.label}</Text>
                  <Text style={s.legendGrams}>
                    {m.grams}
                    <Text style={s.legendUnit}> g</Text>
                  </Text>
                  <Text style={s.legendPct}>{pctLabel(m.pct)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Breakdown — horizontal flow */}
          <View style={s.sectionHead}>
            <View style={s.sectionAccent} />
            <Text style={s.sectionLabel}>CÓMO LLEGAMOS A ESTO</Text>
          </View>
          <View style={s.breakdown}>
            <View style={s.bStep}>
              <Text style={s.bLabel}>BMR</Text>
              <Text style={s.bValue}>{result.bmr.toLocaleString('es-MX')}</Text>
              <Text style={s.bUnit}>kcal</Text>
            </View>
            <Text style={s.bArrow}>→</Text>
            <View style={s.bStep}>
              <Text style={s.bLabel}>TDEE</Text>
              <Text style={s.bValue}>{result.tdee.toLocaleString('es-MX')}</Text>
              <Text style={s.bUnit}>kcal</Text>
            </View>
            <Text style={s.bArrow}>→</Text>
            <View style={s.bStep}>
              <Text style={s.bLabel}>AJUSTE</Text>
              <Text style={s.bValue}>{goalAdjustmentLabel(inputs.goal, inputs.weight)}</Text>
              <Text style={s.bUnit}> </Text>
            </View>
            <Text style={s.bArrow}>→</Text>
            <View style={s.bStepFinal}>
              <Text style={s.bLabelFinal}>OBJETIVO</Text>
              <Text style={s.bValueFinal}>{result.calories.toLocaleString('es-MX')}</Text>
              <Text style={s.bUnitFinal}>kcal</Text>
            </View>
          </View>

          {/* Recap */}
          <View style={s.sectionHead}>
            <View style={s.sectionAccent} />
            <Text style={s.sectionLabel}>LO QUE INGRESASTE</Text>
          </View>
          <View style={s.recap}>
            {recap.map((r) => (
              <View key={r.label} style={s.recapItem}>
                <Text style={s.recapLabel}>{r.label}</Text>
                <Text style={s.recapValue}>{r.value}</Text>
              </View>
            ))}
          </View>

          {/* Warnings */}
          {result.warnings.map((w) => {
            const copy = WARNING_COPY[w];
            if (!copy) return null;
            const palette = copy.tone === 'danger'
              ? { bg: COLORS.dangerBg, bar: COLORS.dangerBar }
              : { bg: COLORS.warnBg, bar: COLORS.warnBar };
            return (
              <View key={w} style={[s.warning, { backgroundColor: palette.bg, borderLeftColor: palette.bar }]}>
                <Text style={[s.warningTitle, { color: palette.bar }]}>{copy.title}</Text>
                <Text style={s.warningBody}>{copy.body}</Text>
              </View>
            );
          })}

          <Text style={s.calibration}>{CALIBRATION_MESSAGE}</Text>

          {/* CTA */}
          <View style={s.ctaWrap}>
            <View style={s.ctaPill}>
              <Text style={s.ctaTitle}>Inscríbete al Curso de Fundamentos</Text>
            </View>
            <Text style={s.ctaSub}>Lista de espera abierta · precio fundador · entrenaconciencia.com</Text>
          </View>

          <View style={s.footerDivider} />
          <Text style={s.footer}>
            No constituye diagnóstico ni reemplaza la valoración clínica individual.
            Si tienes condiciones médicas o tomas medicamentos, consulta con un profesional.
          </Text>
          <Text style={s.footerBrand}>Entrena con Ciencia · entrenaconciencia.com</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderCalculatorReportPdf(props: ReportProps): Promise<Buffer> {
  return renderToBuffer(<CalculatorReportDocument {...props} />);
}

export default CalculatorReportDocument;
