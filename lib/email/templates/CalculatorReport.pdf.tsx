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
  Polygon,
  Line,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  renderToBuffer,
} from '@react-pdf/renderer';
import { COLORS } from '../brand';
import {
  CALIBRATION_MESSAGE,
  ESTIMATE_DISCLAIMER,
  warningCopy,
  inputsSummary,
  macroRows,
  type ReportProps,
} from './sections';
import { goalLabels, goalAdjustment, LOSS_GOALS, MEDICAL_SUPERVISION_NOTE, PREGNANCY_REPORT_NOTE, type CalcWarning } from '@/lib/calorieCalculator';

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

/* ─────────────────────────── Hexagon badge ───────────────────────── */
// Flat-top hexagon (matches the original report template), used in the
// "Gasto Calórico + Ajuste = Calorías" breakdown and the CTA badge.

const HEX_BIG = 56; // breakdown hexagons
const HEX_SM  = 44; // CTA grad-cap badge

// Flat-top hexagon points (flat edges top & bottom, points left & right).
function hexPoints(s: number): string {
  return [
    [0.25 * s, 0],
    [0.75 * s, 0],
    [s, 0.5 * s],
    [0.75 * s, s],
    [0.25 * s, s],
    [0, 0.5 * s],
  ].map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

// Small triangular arrowhead at the tip of a circular arc, pointing along
// the (clockwise) tangent — used to build the "metabolism" recycle glyph.
function arrowHead(cx: number, cy: number, r: number, angle: number): string {
  const px = cx + r * Math.cos(angle);
  const py = cy + r * Math.sin(angle);
  const tx = -Math.sin(angle), ty = Math.cos(angle); // tangent (cw)
  const nx = Math.cos(angle),  ny = Math.sin(angle);  // radial normal
  const tip  = [px + tx * 5.5, py + ty * 5.5];
  const back = [px - tx * 1.5, py - ty * 1.5];
  const b1   = [back[0] + nx * 3.4, back[1] + ny * 3.4];
  const b2   = [back[0] - nx * 3.4, back[1] - ny * 3.4];
  return [tip, b1, b2].map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

function HexBadge({ icon }: { icon: 'metab' | '+' | '−' }) {
  const c = HEX_BIG / 2;
  const gid = `hexFill-${icon}`;
  const rr = 11; // recycle-arc radius
  return (
    <Svg width={HEX_BIG} height={HEX_BIG}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#10A6D6" />
          <Stop offset="1" stopColor={COLORS.teal} />
        </LinearGradient>
      </Defs>
      <Polygon points={hexPoints(HEX_BIG)} fill={`url(#${gid})`} />
      {icon === 'metab' && (
        <>
          {/* two circular arrows = energy turnover / metabolism */}
          <Path d={describeArc(c, c, rr, -2.7, -0.5)} stroke={COLORS.white} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Polygon points={arrowHead(c, c, rr, -0.5)} fill={COLORS.white} />
          <Path d={describeArc(c, c, rr, 0.44, 2.64)} stroke={COLORS.white} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Polygon points={arrowHead(c, c, rr, 2.64)} fill={COLORS.white} />
          {/* droplet in the centre */}
          <Path d={`M ${c} ${c - 5.5} Q ${c + 4.5} ${c + 0.5} ${c} ${c + 4.5} Q ${c - 4.5} ${c + 0.5} ${c} ${c - 5.5} Z`} fill={COLORS.white} />
        </>
      )}
      {icon === '−' && (
        <Line x1={c - 9} y1={c} x2={c + 9} y2={c} stroke={COLORS.white} strokeWidth={3.4} strokeLinecap="round" />
      )}
      {icon === '+' && (
        <>
          <Line x1={c - 9} y1={c} x2={c + 9} y2={c} stroke={COLORS.white} strokeWidth={3.4} strokeLinecap="round" />
          <Line x1={c} y1={c - 9} x2={c} y2={c + 9} stroke={COLORS.white} strokeWidth={3.4} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

function GradCapBadge() {
  const c = HEX_SM / 2;
  return (
    <Svg width={HEX_SM} height={HEX_SM}>
      <Polygon points={hexPoints(HEX_SM)} fill="none" stroke={COLORS.cyan} strokeWidth={1.4} />
      {/* mortarboard */}
      <Polygon points={`${c},${c - 7} ${c + 11},${c - 2} ${c},${c + 3} ${c - 11},${c - 2}`} fill={COLORS.cyan} />
      <Path d={`M ${c + 6} ${c} L ${c + 6} ${c + 7} L ${c - 6} ${c + 7} L ${c - 6} ${c}`} stroke={COLORS.cyan} strokeWidth={1.4} fill="none" />
    </Svg>
  );
}

/* ────────────────────────────── Styles ────────────────────────────── */
// A4 = 595 × 842 pt. Layout is tuned to fit on a single page.

const HERO_HEIGHT = 96;
const PAGE_WIDTH  = 595;

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
  },

  /* Hero */
  hero: {
    backgroundColor: COLORS.teal,
    height: HERO_HEIGHT,
    paddingHorizontal: 36,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  isotipo: { width: 40, height: 40, marginBottom: 4 },
  heroTitleCyan:   { color: COLORS.cyan,   fontSize: 18, fontFamily: 'Helvetica-Bold', letterSpacing: -0.2 },
  heroTitleYellow: { color: COLORS.yellow, fontSize: 18, fontFamily: 'Helvetica-Bold', letterSpacing: -0.2, marginTop: 1 },
  heroSub: { color: 'rgba(255,255,255,0.55)', fontSize: 9, marginTop: 3 },

  /* Body */
  body: { paddingHorizontal: 40, paddingTop: 8, paddingBottom: 8 },

  greeting: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: COLORS.teal, marginBottom: 3 },

  /* Objective pill */
  objectivePill: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.cyan,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  objectiveText: { fontSize: 10, lineHeight: 1.4, color: COLORS.teal },
  objectiveStrong: { fontFamily: 'Helvetica-Bold', color: COLORS.cyan },

  /* Donut row */
  donutRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  donutWrap: { width: 90, height: 90, position: 'relative', marginRight: 18 },
  donutCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  donutCalValue: { fontSize: 20, color: COLORS.cyan, fontFamily: 'Helvetica-Bold' },
  donutCalUnit:  { fontSize: 8, color: COLORS.teal, marginTop: 1 },

  legend: { flex: 1 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomStyle: 'solid', borderBottomColor: '#e3eaef' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  legendNameWrap: { flex: 1 },
  legendName: { fontSize: 10, color: COLORS.teal, fontFamily: 'Helvetica-Bold' },
  legendRange: { fontSize: 7, color: COLORS.textMuted, marginTop: 1 },
  legendGrams: { fontSize: 11, color: COLORS.cyan, fontFamily: 'Helvetica-Bold', marginRight: 8 },
  legendUnit: { fontSize: 8, color: COLORS.teal },
  legendPct: { fontSize: 10, color: COLORS.cyan, fontFamily: 'Helvetica-Bold', width: 32, textAlign: 'right' },

  /* Section heading — sentence-case, teal/cyan bold (matches template) */
  sectionHead: { marginBottom: 5 },
  sectionLabel: { fontSize: 13, color: COLORS.teal, fontFamily: 'Helvetica-Bold', letterSpacing: -0.2 },

  /* Breakdown — Gasto Calórico + Ajuste = Calorías */
  breakdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  bCol: { alignItems: 'center', width: 96 },
  bOp: { fontSize: 22, color: COLORS.navy, fontFamily: 'Helvetica-Bold', marginHorizontal: 4 },
  bLabel: { fontSize: 9, letterSpacing: 0.3, color: COLORS.teal, fontFamily: 'Helvetica-Bold', marginTop: 5 },
  bValue: { fontSize: 12, color: COLORS.cyan, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  bValueUnit: { fontSize: 8, color: COLORS.textMuted, marginTop: 1 },
  bResult: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.white, borderRadius: 10,
    borderWidth: 1.2, borderStyle: 'solid', borderColor: COLORS.cyan,
    paddingVertical: 8, paddingHorizontal: 14, width: 124,
  },
  bResultLabel: { fontSize: 8, color: COLORS.teal, fontFamily: 'Helvetica-Bold' },
  bResultValue: { fontSize: 20, color: COLORS.cyan, fontFamily: 'Helvetica-Bold', marginTop: 2 },
  bResultUnit: { fontSize: 8, color: COLORS.teal, marginTop: 1 },
  bmrNote: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center', lineHeight: 1.4, marginBottom: 5, marginTop: 1 },
  bmrNoteStrong: { fontFamily: 'Helvetica-Bold', color: COLORS.teal },

  /* Tus datos — 3-col grid, label over value */
  datosGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 5 },
  datosItem: { width: '33.33%', paddingVertical: 2, paddingRight: 8 },
  datosLabel: { fontSize: 8.5, color: COLORS.teal },
  datosValue: { fontSize: 10, color: COLORS.navy, fontFamily: 'Helvetica-Bold', marginTop: 1 },

  /* Warnings */
  warning: { borderRadius: 4, padding: 5, marginBottom: 4, borderLeftWidth: 3, borderLeftStyle: 'solid' },
  warningTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 1 },
  warningBody: { fontSize: 8.5, lineHeight: 1.35, color: COLORS.textDark },

  /* Disclaimer — bold, centered (template) */
  disclaimer: { fontSize: 9, lineHeight: 1.4, color: COLORS.textDark, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 4, marginBottom: 3, paddingHorizontal: 12 },
  calibration: { fontSize: 8, fontStyle: 'italic', color: COLORS.textMuted, lineHeight: 1.35, textAlign: 'center', marginBottom: 4 },

  /* CTA — dark banner with grad-cap badge + yellow button */
  ctaBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.navy, borderRadius: 10,
    borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(35,211,255,0.35)',
    padding: 9, marginBottom: 6,
  },
  ctaLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  ctaTextWrap: { marginLeft: 10 },
  ctaInscribe: { fontSize: 11, color: COLORS.white, fontFamily: 'Helvetica-Bold' },
  ctaCourse: { fontSize: 13, color: COLORS.cyan, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  ctaRight: { alignItems: 'center' },
  ctaButton: { backgroundColor: COLORS.yellow, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 16 },
  ctaButtonText: { fontSize: 10, color: COLORS.navy, fontFamily: 'Helvetica-Bold', letterSpacing: 0.3 },
  ctaWaitlist: { fontSize: 7.5, color: COLORS.cyanSoft, marginTop: 5 },

  footerDivider: { height: 0.5, backgroundColor: '#e3eaef', marginVertical: 4 },
  footer: { fontSize: 7.5, color: COLORS.textMuted, lineHeight: 1.4, textAlign: 'center' },
  footerBrand: { fontSize: 8, color: COLORS.teal, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 3 },
});

/* ─────────────────────────────── Document ─────────────────────────────── */

function CalculatorReportDocument({ name, inputs, result }: ReportProps) {
  const goalTitle = goalLabels[inputs.goal].title;
  const dateLabel = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  const macros = macroRows(result);
  const datos  = inputsSummary(inputs);
  // Ajuste = the real goal adjustment (0 for maintenance). Gasto absorbs the
  // macro rounding remainder so Gasto + Ajuste = Calorías holds exactly while
  // maintenance still shows a 0 adjustment.
  const adjKcal   = Math.round(goalAdjustment(inputs.weight, inputs.goal));
  const adj       = { operator: (adjKcal < 0 ? '−' : '+') as '−' | '+', kcal: Math.abs(adjKcal) };
  const gastoKcal = result.calories - adjKcal;

  // v14 — red safety callout when the medical screening flags supervision.
  const showSupervision = result.warnings.includes('supervision_medica');
  const supervisionIsLoss = LOSS_GOALS.includes(inputs.goal);
  // Pregnancy/lactation persistent callout — yellow by default, escalates to
  // red + extra line when another screening flag also fired (supervision_medica).
  const showPregnancy = inputs.pregnancyLactation === true;
  const pregnancyEscalated = showSupervision;

  return (
    <Document title="Reporte personalizado — Entrena con Ciencia" author="Entrena con Ciencia">
      <Page size="A4" style={s.page}>
        {/* Hero with SVG radial glow — mirrors the landing's radial-gradient hero */}
        <View style={s.hero}>
          <Svg style={s.heroBg} width={PAGE_WIDTH} height={HERO_HEIGHT}>
            <Defs>
              <LinearGradient id="heroBase" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0"   stopColor="#0E6E91" />
                <Stop offset="0.55" stopColor={COLORS.teal} />
                <Stop offset="1"   stopColor="#013B4F" />
              </LinearGradient>
              <RadialGradient id="heroGlow" cx="50%" cy="6%" r="60%">
                <Stop offset="0%"  stopColor={COLORS.cyanSoft} stopOpacity={0.5} />
                <Stop offset="55%" stopColor={COLORS.teal} stopOpacity={0} />
                <Stop offset="100%" stopColor={COLORS.teal} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={PAGE_WIDTH} height={HERO_HEIGHT} fill="url(#heroBase)" />
            <Rect x={0} y={0} width={PAGE_WIDTH} height={HERO_HEIGHT} fill="url(#heroGlow)" />
          </Svg>
          <View style={s.heroContent}>
            {isotipoBuffer && <Image style={s.isotipo} src={isotipoBuffer} />}
            <Text style={s.heroTitleCyan}>Entrena con Ciencia</Text>
            <Text style={s.heroTitleYellow}>Reporte Personalizado</Text>
            <Text style={s.heroSub}>Generado el {dateLabel}</Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.greeting}>Hola, {name}.</Text>

          {/* Objective pill */}
          <View style={s.objectivePill}>
            <Text style={s.objectiveText}>
              Esto es lo que calculamos para tu objetivo de{' '}
              <Text style={s.objectiveStrong}>{goalTitle}</Text>.
            </Text>
          </View>

          {/* v14 — pregnancy/lactation persistent callout (top of report, any goal) */}
          {showPregnancy && (
            <View style={[s.warning, { backgroundColor: pregnancyEscalated ? COLORS.dangerBg : COLORS.warnBg, borderLeftColor: pregnancyEscalated ? COLORS.dangerBar : COLORS.warnBar }]}>
              <Text style={[s.warningTitle, { color: pregnancyEscalated ? COLORS.dangerBar : COLORS.textDark }]}>{PREGNANCY_REPORT_NOTE.title}</Text>
              <Text style={s.warningBody}>
                {PREGNANCY_REPORT_NOTE.body}
                {pregnancyEscalated ? ` ${PREGNANCY_REPORT_NOTE.extra}` : ''}
              </Text>
            </View>
          )}

          {/* v14 — medical-supervision red callout (top of report, loss only) */}
          {showSupervision && supervisionIsLoss && (
            <View style={[s.warning, { backgroundColor: COLORS.dangerBg, borderLeftColor: COLORS.dangerBar }]}>
              <Text style={[s.warningTitle, { color: COLORS.dangerBar }]}>{MEDICAL_SUPERVISION_NOTE.title}</Text>
              <Text style={s.warningBody}>{MEDICAL_SUPERVISION_NOTE.body}</Text>
            </View>
          )}

          {/* Aviso — only ONE list aviso shows: the highest-priority one
              overrides the rest. supervision_medica is excluded (it renders as
              the loss-only red box above); the pregnancy box also always shows
              independently. Priority (gana el de arriba): proyeccion_bajo_peso >
              descontrol_alimentario > deficit_limitado > carbo_bajo/alto. */}
          {(() => {
            const PRIORITY: CalcWarning[] = ['proyeccion_bajo_peso', 'descontrol_alimentario', 'deficit_limitado', 'carbo_bajo', 'carbo_alto'];
            const w = PRIORITY.find((p) => result.warnings.includes(p));
            if (!w) return null;
            const copy = warningCopy(w, { sex: inputs.sex });
            if (!copy) return null;
            // v14 — avisos render in brand green; v15 — descontrol_alimentario
            // and proyeccion_bajo_peso render orange.
            const orange = w === 'descontrol_alimentario' || w === 'proyeccion_bajo_peso';
            return (
              <View style={[s.warning, { backgroundColor: orange ? COLORS.orangeBg : COLORS.noteBg, borderLeftColor: orange ? COLORS.orangeBar : COLORS.noteBar }]}>
                <Text style={[s.warningTitle, { color: COLORS.textDark }]}>{copy.title}</Text>
                <Text style={s.warningBody}>{copy.body}</Text>
              </View>
            );
          })()}

          {/* Donut + macro legend */}
          <View style={s.donutRow}>
            <View style={s.donutWrap}>
              <DonutChart
                segments={macros.map((m) => ({ value: m.pct, color: m.color }))}
                size={90}
                thickness={14}
              />
              <View style={s.donutCenter}>
                <Text style={s.donutCalValue}>{result.calories.toLocaleString('es-MX')}</Text>
                <Text style={s.donutCalUnit}>kcal/día</Text>
              </View>
            </View>

            <View style={s.legend}>
              {macros.map((m) => (
                <View key={m.label} style={s.legendRow}>
                  <View style={[s.legendDot, { backgroundColor: m.color }]} />
                  <View style={s.legendNameWrap}>
                    <Text style={s.legendName}>{m.label}</Text>
                    <Text style={s.legendRange}>recomendado · rango {m.min}–{m.max} g</Text>
                  </View>
                  <Text style={[s.legendGrams, { color: m.color }]}>
                    {m.grams}
                    <Text style={s.legendUnit}> g</Text>
                  </Text>
                  <Text style={[s.legendPct, { color: m.color }]}>{m.pctInt}%</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Breakdown — Gasto Calórico + Ajuste = Calorías */}
          <View style={s.sectionHead}>
            <Text style={s.sectionLabel}>Cómo calculamos tus calorías</Text>
          </View>
          <View style={s.breakdown}>
            <View style={s.bCol}>
              <HexBadge icon="metab" />
              <Text style={s.bLabel}>Gasto calórico</Text>
              <Text style={s.bValue}>
                {gastoKcal.toLocaleString('es-MX')}<Text style={s.bValueUnit}> kcal</Text>
              </Text>
            </View>
            <Text style={s.bOp}>+</Text>
            <View style={s.bCol}>
              <HexBadge icon={adj.operator} />
              <Text style={s.bLabel}>Ajuste</Text>
              <Text style={s.bValue}>
                {adj.kcal.toLocaleString('es-MX')}<Text style={s.bValueUnit}> kcal</Text>
              </Text>
            </View>
            <Text style={s.bOp}>=</Text>
            <View style={s.bResult}>
              <Text style={s.bResultLabel}>Calorías diarias</Text>
              <Text style={s.bResultValue}>{result.calories.toLocaleString('es-MX')}</Text>
              <Text style={s.bResultUnit}>kcal/día</Text>
            </View>
          </View>
          <Text style={s.bmrNote}>
            Tu gasto calórico parte de tu metabolismo basal (BMR):{' '}
            <Text style={s.bmrNoteStrong}>{result.bmr.toLocaleString('es-MX')} kcal/día</Text>, multiplicado por tu nivel de actividad.
          </Text>

          {/* Tus datos */}
          <View style={s.sectionHead}>
            <Text style={s.sectionLabel}>Tus datos</Text>
          </View>
          <View style={s.datosGrid}>
            {datos.map((d) => (
              <View key={d.label} style={s.datosItem}>
                <Text style={s.datosLabel}>{d.label}</Text>
                <Text style={s.datosValue}>{d.value}</Text>
              </View>
            ))}
          </View>

          {/* Disclaimer + calibration */}
          <Text style={s.disclaimer}>{ESTIMATE_DISCLAIMER}</Text>
          <Text style={s.calibration}>{CALIBRATION_MESSAGE}</Text>

          {/* CTA banner */}
          <View style={s.ctaBanner}>
            <View style={s.ctaLeft}>
              <GradCapBadge />
              <View style={s.ctaTextWrap}>
                <Text style={s.ctaInscribe}>Inscríbete al</Text>
                <Text style={s.ctaCourse}>Curso de Fundamentos</Text>
              </View>
            </View>
            <View style={s.ctaRight}>
              <View style={s.ctaButton}>
                <Text style={s.ctaButtonText}>QUIERO INSCRIBIRME</Text>
              </View>
              <Text style={s.ctaWaitlist}>Lista de espera abierta</Text>
            </View>
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
