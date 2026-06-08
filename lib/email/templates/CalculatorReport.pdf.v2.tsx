/**
 * v2 PDF template — modelled on the designer mockup
 * (`Reporte personalizado_Entrena con Ciencia.pdf`). Built side by side with
 * the existing v1 (`CalculatorReport.pdf.tsx`) so they can be compared via
 * `/api/preview-report?format=pdf&version=v2`.
 *
 * All dynamic values are wired to the same `ReportProps` shape the wizard
 * already sends; static elements (titles, icons, calibration copy, CTA copy,
 * footer disclaimer) are hardcoded to match the designer.
 */
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
  G,
  Polygon,
  renderToBuffer,
} from '@react-pdf/renderer';
import { COLORS } from '../brand';
import {
  CALIBRATION_MESSAGE,
  inputsSummary,
  macroRows,
  type ReportProps,
} from './sections';
import {
  goalLabels,
  WEEKLY_GOAL_PCT,
  goalAdjustment,
  warningCopy,
  type CalcWarning,
} from '@/lib/calorieCalculator';

let isotipoBuffer: Buffer | null = null;
try {
  isotipoBuffer = fs.readFileSync(path.join(process.cwd(), 'public', 'images', 'isotipo-cyan.png'));
} catch (err) {
  console.warn('[pdf-v2] could not load isotipo-cyan.png:', err);
}

const PAGE_WIDTH = 595;
const HERO_HEIGHT = 170;        // navy band inside the card (measured from designer)
const CARD_RADIUS = 14;
const PAGE_BG = '#fbfaf3';      // cream page background behind the card
const CARD_BORDER = '#d8dfe6';

/* ─────────────────────────── helpers ─────────────────────────── */

function describeArc(cx: number, cy: number, r: number, startA: number, endA: number): string {
  const x1 = cx + r * Math.cos(startA);
  const y1 = cy + r * Math.sin(startA);
  const x2 = cx + r * Math.cos(endA);
  const y2 = cy + r * Math.sin(endA);
  const largeArc = endA - startA > Math.PI ? 1 : 0;
  return `M ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`;
}

function DonutChart({
  segments,
  size,
  thickness,
}: {
  segments: { value: number; color: string }[];
  size: number;
  thickness: number;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const total = segments.reduce((sum, x) => sum + x.value, 0) || 1;
  const gap = 0.02;
  let cursor = -Math.PI / 2;
  const arcs = segments.map((seg, i) => {
    const sweep = (seg.value / total) * (2 * Math.PI);
    const start = cursor + gap / 2;
    const end = cursor + sweep - gap / 2;
    cursor += sweep;
    if (sweep <= gap * 2) return null;
    return (
      <Path
        key={i}
        d={describeArc(cx, cy, r, start, end)}
        stroke={seg.color}
        strokeWidth={thickness}
        strokeLinecap="butt"
        fill="none"
      />
    );
  });
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke="#eaeef2" strokeWidth={thickness} fill="none" />
      {arcs}
    </Svg>
  );
}

/** Hex tile used for "Gasto Calórico", "Ajuste" and the CTA graduation cap. */
function HexTile({ icon, size = 56 }: { icon: 'tdee' | 'adjust' | 'cap'; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Polygon
        points="30,3 53,18 53,42 30,57 7,42 7,18"
        fill="none"
        stroke={COLORS.cyan}
        strokeWidth={2}
      />
      {icon === 'tdee' && (
        <G>
          {/* circular arrow (refresh) */}
          <Path
            d="M 22 30 A 8 8 0 1 1 30 38"
            fill="none"
            stroke={COLORS.cyan}
            strokeWidth={1.6}
          />
          <Polygon points="30,35 30,41 26,38" fill={COLORS.cyan} />
        </G>
      )}
      {icon === 'adjust' && (
        <G>
          {/* simplified gear: ring + 4 teeth */}
          <Circle cx={30} cy={30} r={5.5} fill="none" stroke={COLORS.cyan} strokeWidth={1.6} />
          <Path
            d="M30 18 v 4 M30 38 v 4 M18 30 h 4 M38 30 h 4"
            stroke={COLORS.cyan}
            strokeWidth={1.6}
          />
        </G>
      )}
      {icon === 'cap' && (
        <G>
          {/* graduation cap */}
          <Polygon
            points="14,28 30,22 46,28 30,34"
            fill="none"
            stroke={COLORS.cyan}
            strokeWidth={1.6}
          />
          <Path
            d="M 22 31 v 6 q 0 4 8 4 q 8 0 8 -4 v -6"
            fill="none"
            stroke={COLORS.cyan}
            strokeWidth={1.6}
          />
          <Path d="M 46 28 v 8" stroke={COLORS.cyan} strokeWidth={1.6} />
        </G>
      )}
    </Svg>
  );
}

/* ───────────────────────────── styles ───────────────────────────── */

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: PAGE_BG,
  },

  /* One big rounded card that wraps everything (hero + body). */
  card: {
    marginHorizontal: 22,
    marginTop: 18,
    marginBottom: 6,
    borderRadius: CARD_RADIUS,
    borderWidth: 0.6,
    borderColor: CARD_BORDER,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },

  /* Hero band — sits at the top of the card; corners come from the card overflow:hidden. */
  hero: {
    backgroundColor: COLORS.navy,
    height: HERO_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 14,
    paddingBottom: 14,
  },
  isotipo: { width: 60, height: 60, marginBottom: 6 },
  brandTitle: {
    color: COLORS.cyan,
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  reportTitle: {
    color: COLORS.yellow,
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginTop: 3,
  },
  heroDate: {
    color: COLORS.cyanSoft,
    fontSize: 10,
    marginTop: 6,
    opacity: 0.85,
    textAlign: 'center',
  },

  /* Body area — white inside the card, below the hero. */
  body: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 14,
  },

  greeting: {
    color: COLORS.yellow,
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 7,
  },

  /* Goal pill */
  goalPill: {
    borderWidth: 1,
    borderColor: COLORS.cyan,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  goalPillText: { fontSize: 10, color: COLORS.textDark },
  goalPillAccent: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: COLORS.yellow },

  /* Donut + macros */
  donutRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  donutWrap: {
    width: 108,
    height: 108,
    position: 'relative',
    marginRight: 16,
  },
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutNumber: { color: COLORS.navy, fontSize: 20, fontFamily: 'Helvetica-Bold' },
  donutUnit: { color: COLORS.textMuted, fontSize: 8, marginTop: -1 },

  macroList: { flex: 1 },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomStyle: 'solid',
    borderBottomColor: '#e6ebef',
  },
  macroRowLast: { borderBottomWidth: 0 },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  macroName: { fontSize: 10, color: COLORS.navy, fontFamily: 'Helvetica-Bold' },
  macroRange: { fontSize: 7.5, color: COLORS.textMuted, marginTop: 1 },
  macroGrams: {
    fontSize: 12,
    color: COLORS.yellow,
    fontFamily: 'Helvetica-Bold',
    marginRight: 14,
  },
  macroGramsUnit: { fontSize: 8, color: COLORS.textMuted },
  macroPct: { fontSize: 10, color: COLORS.textMuted, width: 30, textAlign: 'right' },

  /* Section heading (yellow per designer) */
  sectionHead: {
    color: COLORS.yellow,
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    marginTop: 2,
  },

  /* "Cómo calculamos" — hex flow */
  hexFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  hexTileCol: { alignItems: 'center', width: 90 },
  hexTileLabel: { color: COLORS.navy, fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 6 },
  hexTileValue: { color: COLORS.navy, fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  hexTileUnit: { color: COLORS.textMuted, fontSize: 8 },
  hexSeparator: {
    color: COLORS.cyan,
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    marginHorizontal: 6,
    marginTop: -8,
  },
  hexResult: {
    borderWidth: 1,
    borderColor: COLORS.cyan,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    width: 110,
    marginTop: -8,
  },
  hexResultLabel: { color: COLORS.cyan, fontSize: 8 },
  hexResultValue: { color: COLORS.navy, fontSize: 16, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  hexResultUnit: { color: COLORS.textMuted, fontSize: 8 },

  /* Tus datos */
  datosGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  datosItem: { width: '33.333%', paddingVertical: 4, paddingRight: 8 },
  datosLabel: { color: COLORS.teal, fontSize: 8, marginBottom: 2 },
  datosValue: { color: COLORS.navy, fontSize: 10, fontFamily: 'Helvetica-Bold' },

  /* Warnings */
  warning: {
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
  },
  warningTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 2, color: COLORS.textDark },
  warningBody: { fontSize: 8.5, lineHeight: 1.4, color: COLORS.textDark },

  /* Calibration */
  calibration: {
    color: COLORS.navy,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    lineHeight: 1.45,
    marginVertical: 8,
    paddingHorizontal: 16,
  },

  /* CTA card */
  ctaCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ctaIconWrap: {
    width: 50,
    height: 50,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextWrap: { flex: 1 },
  ctaTitle: { color: COLORS.white, fontSize: 11, fontFamily: 'Helvetica-Bold' },
  ctaSubtitle: { color: COLORS.cyan, fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  ctaRight: { alignItems: 'flex-end' },
  ctaButton: {
    borderWidth: 1,
    borderColor: COLORS.cyan,
    borderRadius: 6,
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  ctaButtonText: { color: COLORS.navy, fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 0.4 },
  ctaWaitlist: { color: COLORS.cyan, fontSize: 8, marginTop: 4 },

  /* Footer (outside the card) */
  footer: {
    color: COLORS.textMuted,
    fontSize: 7.5,
    lineHeight: 1.4,
    textAlign: 'center',
    marginHorizontal: 26,
    marginBottom: 10,
  },
});

/* ─────────────────────────── document ─────────────────────────── */

function CalculatorReportV2({ name, inputs, result }: ReportProps) {
  const goalTitleRaw = goalLabels[inputs.goal].title;
  // The designer pill shows: "<descripción> — <X.XX% por semana>"
  const goalPct = WEEKLY_GOAL_PCT[inputs.goal];
  const goalRateText = goalPct === 0 ? '' : `${(Math.abs(goalPct) * 100).toFixed(2)}% por semana`;
  // Trim the parenthetical "(0.70%/semana)" from the catalog label since we
  // surface the rate separately in the pill accent.
  const goalDescription = goalTitleRaw.replace(/\s*\([^)]*\)\s*$/, '');

  const adjMag = Math.round(Math.abs(goalAdjustment(inputs.weight, inputs.goal)));
  const dateLabel = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const macros = macroRows(result);
  const datos = inputsSummary(inputs);

  // v15 — single highest-priority aviso to surface in the report (same logic as v1).
  const PRIORITY: CalcWarning[] = [
    'proyeccion_bajo_peso',
    'descontrol_alimentario',
    'deficit_limitado',
    'carbo_bajo',
    'carbo_alto',
  ];
  const activeWarning = PRIORITY.find((p) => result.warnings.includes(p));
  const warningPalette = (w: CalcWarning) => {
    const orange = w === 'descontrol_alimentario' || w === 'proyeccion_bajo_peso';
    return orange
      ? { bg: COLORS.orangeBg, bar: COLORS.orangeBar }
      : { bg: COLORS.noteBg, bar: COLORS.noteBar };
  };

  return (
    <Document title="Reporte personalizado — Entrena con Ciencia" author="Entrena con Ciencia">
      <Page size="A4" style={s.page}>
        {/* One rounded card wraps the hero + body (overflow:hidden gives the
            navy hero its rounded top corners and the white body its rounded
            bottom corners in a single shape). */}
        <View style={s.card}>
        {/* Hero band */}
        <View style={s.hero}>
          <Svg style={s.heroBg} width={PAGE_WIDTH} height={HERO_HEIGHT}>
            <Defs>
              <RadialGradient id="heroGlow" cx="50%" cy="50%" r="75%">
                <Stop offset="0%" stopColor={COLORS.teal} stopOpacity={0.55} />
                <Stop offset="55%" stopColor={COLORS.navy} stopOpacity={0.3} />
                <Stop offset="100%" stopColor={COLORS.navy} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={PAGE_WIDTH} height={HERO_HEIGHT} fill="url(#heroGlow)" />
          </Svg>
          <View style={s.heroContent}>
            {isotipoBuffer && <Image style={s.isotipo} src={isotipoBuffer} />}
            <Text style={s.brandTitle}>Entrena con Ciencia</Text>
            <Text style={s.reportTitle}>Reporte Personalizado</Text>
            <Text style={s.heroDate}>Generado el {dateLabel}</Text>
          </View>
        </View>

        {/* Body card */}
        <View style={s.body}>
          <Text style={s.greeting}>Hola, {name}.</Text>

          {/* Goal pill */}
          <View style={s.goalPill}>
            <Text style={s.goalPillText}>
              Esto es lo que calculamos para tu objetivo de {goalDescription.toLowerCase()}
              {goalRateText ? ' — ' : ''}
            </Text>
            {goalRateText ? <Text style={s.goalPillAccent}>{goalRateText}</Text> : null}
          </View>

          {/* Donut + macro list */}
          <View style={s.donutRow}>
            <View style={s.donutWrap}>
              <DonutChart
                segments={macros.map((m) => ({ value: m.pct, color: m.color }))}
                size={108}
                thickness={14}
              />
              <View style={s.donutCenter}>
                <Text style={s.donutNumber}>{result.calories.toLocaleString('es-MX')}</Text>
                <Text style={s.donutUnit}>kcal/día</Text>
              </View>
            </View>
            <View style={s.macroList}>
              {macros.map((m, i) => (
                <View
                  key={m.label}
                  style={i === macros.length - 1 ? [s.macroRow, s.macroRowLast] : s.macroRow}
                >
                  <View style={[s.macroDot, { backgroundColor: m.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.macroName}>{m.label}</Text>
                    <Text style={s.macroRange}>rango {m.min}–{m.max} g</Text>
                  </View>
                  <Text style={s.macroGrams}>
                    {m.grams}
                    <Text style={s.macroGramsUnit}> g</Text>
                  </Text>
                  <Text style={s.macroPct}>{m.pctInt}%</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Cómo calculamos — hex flow */}
          <Text style={s.sectionHead}>Como calculamos tus calorías</Text>
          <View style={s.hexFlow}>
            <View style={s.hexTileCol}>
              <HexTile icon="tdee" />
              <Text style={s.hexTileLabel}>Gasto Calórico</Text>
              <Text style={s.hexTileValue}>{result.tdee.toLocaleString('es-MX')}</Text>
              <Text style={s.hexTileUnit}>kcal</Text>
            </View>
            <Text style={s.hexSeparator}>+</Text>
            <View style={s.hexTileCol}>
              <HexTile icon="adjust" />
              <Text style={s.hexTileLabel}>Ajuste</Text>
              <Text style={s.hexTileValue}>{adjMag.toLocaleString('es-MX')}</Text>
              <Text style={s.hexTileUnit}>kcal</Text>
            </View>
            <Text style={s.hexSeparator}>=</Text>
            <View style={s.hexResult}>
              <Text style={s.hexResultLabel}>Calorías diarias</Text>
              <Text style={s.hexResultValue}>{result.calories.toLocaleString('es-MX')}</Text>
              <Text style={s.hexResultUnit}>kcal/día</Text>
            </View>
          </View>

          {/* Tus datos */}
          <Text style={s.sectionHead}>Tus datos</Text>
          <View style={s.datosGrid}>
            {datos.map((row) => (
              <View key={row.label} style={s.datosItem}>
                <Text style={s.datosLabel}>{row.label}</Text>
                <Text style={s.datosValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          {/* Single top-priority aviso (if any) */}
          {activeWarning &&
            (() => {
              const copy = warningCopy(activeWarning, { sex: inputs.sex });
              if (!copy) return null;
              const palette = warningPalette(activeWarning);
              return (
                <View
                  style={[
                    s.warning,
                    { backgroundColor: palette.bg, borderLeftColor: palette.bar },
                  ]}
                >
                  <Text style={s.warningTitle}>{copy.title}</Text>
                  <Text style={s.warningBody}>{copy.body}</Text>
                </View>
              );
            })()}

          {/* Calibration */}
          <Text style={s.calibration}>{CALIBRATION_MESSAGE}</Text>

          {/* CTA card */}
          <View style={s.ctaCard}>
            <View style={s.ctaIconWrap}>
              <HexTile icon="cap" />
            </View>
            <View style={s.ctaTextWrap}>
              <Text style={s.ctaTitle}>Inscríbete al</Text>
              <Text style={s.ctaSubtitle}>Curso de Fundamentos</Text>
            </View>
            <View style={s.ctaRight}>
              <View style={s.ctaButton}>
                <Text style={s.ctaButtonText}>QUIERO INSCRIBIRME</Text>
              </View>
              <Text style={s.ctaWaitlist}>Lista de espera abierta</Text>
            </View>
          </View>
        </View>
        </View>{/* /card */}

        {/* Footer (outside the card, on the cream page bg) */}
        <Text style={s.footer}>
          No constituye diagnóstico ni reemplaza la valoración clínica individual. Si tienes condiciones médicas o tomas medicamentos, consulta con un profesional.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderCalculatorReportPdfV2(props: ReportProps): Promise<Buffer> {
  return renderToBuffer(<CalculatorReportV2 {...props} />);
}

export default CalculatorReportV2;
