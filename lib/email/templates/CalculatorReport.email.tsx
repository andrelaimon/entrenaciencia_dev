import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { COLORS, FONT_STACK, COURSE_CTA_URL, SITE_URL } from '../brand';
import {
  CALIBRATION_MESSAGE,
  ESTIMATE_DISCLAIMER,
  warningCopy,
  inputsSummary,
  macroRows,
  type ReportProps,
} from './sections';
import { goalLabels, goalAdjustment, LOSS_GOALS, MEDICAL_SUPERVISION_NOTE, PREGNANCY_REPORT_NOTE, type CalcWarning } from '@/lib/calorieCalculator';

/* ─── Donut chart (inline SVG) — macro distribution by % ─── */
function describeArc(cx: number, cy: number, r: number, startA: number, endA: number): string {
  const x1 = cx + r * Math.cos(startA);
  const y1 = cy + r * Math.sin(startA);
  const x2 = cx + r * Math.cos(endA);
  const y2 = cy + r * Math.sin(endA);
  const largeArc = endA - startA > Math.PI ? 1 : 0;
  return `M ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`;
}

function MacroDonut({ macros, calories }: { macros: ReturnType<typeof macroRows>; calories: number }) {
  const size = 150, thickness = 20;
  const r = (size - thickness) / 2, cx = size / 2, cy = size / 2;
  const total = macros.reduce((s, m) => s + m.pct, 0) || 1;
  const gap = 0.04;
  let cursor = -Math.PI / 2;
  const arcs = macros.map((m, i) => {
    const sweep = (m.pct / total) * 2 * Math.PI;
    const start = cursor + gap / 2;
    const end = cursor + sweep - gap / 2;
    cursor += sweep;
    if (sweep <= gap * 2) return null;
    return <path key={i} d={describeArc(cx, cy, r, start, end)} stroke={m.color} strokeWidth={thickness} fill="none" />;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <circle cx={cx} cy={cy} r={r} stroke="#eef3f6" strokeWidth={thickness} fill="none" />
      {arcs}
      <text x={cx} y={cy - 1} textAnchor="middle" fontSize={27} fontWeight={800} fill={COLORS.cyan} fontFamily={FONT_STACK}>
        {calories.toLocaleString('es-MX')}
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={11} fill={COLORS.teal} fontFamily={FONT_STACK}>
        kcal/día
      </text>
    </svg>
  );
}

export default function CalculatorReportEmail({ name, inputs, result, baseUrl }: ReportProps & { baseUrl?: string }) {
  const logoSrc = `${baseUrl ?? SITE_URL}/images/isotipo-cyan.png`;
  const goalTitle = goalLabels[inputs.goal].title;
  // Ajuste = the real goal adjustment (0 for maintenance). Gasto absorbs the
  // macro rounding remainder so Gasto + Ajuste = Calorías holds exactly while
  // maintenance still shows a 0 adjustment.
  const adjKcal  = Math.round(goalAdjustment(inputs.weight, inputs.goal));
  const adj      = { operator: (adjKcal < 0 ? '−' : '+') as '−' | '+', kcal: Math.abs(adjKcal) };
  const gastoKcal = result.calories - adjKcal;
  const macros = macroRows(result);

  // v14 — red safety callout when the medical screening flags supervision.
  const showSupervision = result.warnings.includes('supervision_medica');
  const supervisionIsLoss = LOSS_GOALS.includes(inputs.goal);
  // Pregnancy/lactation persistent callout — yellow by default, escalates to
  // red + extra line when another screening flag also fired (supervision_medica).
  const showPregnancy = inputs.pregnancyLactation === true;
  const pregnancyEscalated = showSupervision;

  return (
    <Html lang="es">
      <Head />
      <Preview>{`Tu reporte personalizado: ${result.calories} kcal/día`}</Preview>
      <Body style={{ background: COLORS.offwhite, fontFamily: FONT_STACK, margin: 0, padding: 0 }}>
        <Container style={containerStyle}>
          {/* Header band — logo + two-color title */}
          <Section style={headerStyle}>
            <Img
              src={logoSrc}
              alt="Entrena con Ciencia"
              width={84}
              height={84}
              style={brandLogo}
            />
            <Text style={brandTitleCyan}>Entrena con Ciencia</Text>
            <Text style={brandTitleYellow}>Reporte Personalizado</Text>
          </Section>

          {/* Greeting + objective pill */}
          <Section style={padX}>
            <Text style={greeting}>Hola, {name}.</Text>
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
              <tbody>
                <tr>
                  <td style={objectivePill}>
                    <Text style={objectiveText}>
                      Esto es lo que calculamos para tu objetivo de <strong style={{ color: COLORS.cyan }}>{goalTitle}</strong>.
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* v14 — pregnancy/lactation persistent callout (top of report, any goal) */}
          {showPregnancy && (
            <Section style={padX}>
              <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ marginBottom: 4 }}>
                <tbody>
                  <tr>
                    <td style={{ background: pregnancyEscalated ? COLORS.dangerBg : COLORS.warnBg, borderLeft: `4px solid ${pregnancyEscalated ? COLORS.dangerBar : COLORS.warnBar}`, padding: '12px 14px', borderRadius: 6 }}>
                      <Text style={{ ...warningTitle, color: pregnancyEscalated ? COLORS.dangerBar : COLORS.textDark }}>{PREGNANCY_REPORT_NOTE.title}</Text>
                      <Text style={warningBody}>
                        {PREGNANCY_REPORT_NOTE.body}
                        {pregnancyEscalated ? ` ${PREGNANCY_REPORT_NOTE.extra}` : ''}
                      </Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
          )}

          {/* v14 — medical-supervision red callout (top of report, loss only) */}
          {showSupervision && supervisionIsLoss && (
            <Section style={padX}>
              <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ marginBottom: 4 }}>
                <tbody>
                  <tr>
                    <td style={{ background: COLORS.dangerBg, borderLeft: `4px solid ${COLORS.dangerBar}`, padding: '12px 14px', borderRadius: 6 }}>
                      <Text style={{ ...warningTitle, color: COLORS.dangerBar }}>{MEDICAL_SUPERVISION_NOTE.title}</Text>
                      <Text style={warningBody}>{MEDICAL_SUPERVISION_NOTE.body}</Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
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
            const bg = orange ? COLORS.orangeBg : COLORS.noteBg;
            const bar = orange ? COLORS.orangeBar : COLORS.noteBar;
            return (
              <Section style={padX}>
                <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ marginBottom: 12 }}>
                  <tbody>
                    <tr>
                      <td style={{ background: bg, borderLeft: `4px solid ${bar}`, padding: '12px 14px', borderRadius: 6 }}>
                        <Text style={{ ...warningTitle, color: COLORS.textDark }}>{copy.title}</Text>
                        <Text style={warningBody}>{copy.body}</Text>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Section>
            );
          })()}

          {/* Macro distribution — donut + legend (matches template) */}
          <Section style={{ ...padX, paddingTop: 6, paddingBottom: 6 }}>
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
              <tbody>
                <tr>
                  <td style={{ width: 166, verticalAlign: 'middle', textAlign: 'center' as const }}>
                    <MacroDonut macros={macros} calories={result.calories} />
                  </td>
                  <td style={{ verticalAlign: 'middle', paddingLeft: 10 }}>
                    {macros.map((row) => (
                      <table key={row.label} width="100%" cellPadding={0} cellSpacing={0} role="presentation"
                        style={{ borderBottom: '1px solid #e3eaef' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: 16, verticalAlign: 'middle', padding: '7px 0' }}>
                              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: row.color }} />
                            </td>
                            <td style={{ verticalAlign: 'middle', padding: '7px 0' }}>
                              <Text style={legendName}>{row.label}</Text>
                              <Text style={legendRange}>{`recomendado · rango ${row.min}–${row.max} g`}</Text>
                            </td>
                            <td style={{ verticalAlign: 'middle', padding: '7px 0', textAlign: 'right' as const, whiteSpace: 'nowrap' as const }}>
                              <span style={{ ...legendGrams, color: row.color }}>{row.grams}</span>
                              <span style={legendUnit}> g</span>
                            </td>
                            <td style={{ verticalAlign: 'middle', padding: '7px 0 7px 10px', textAlign: 'right' as const, width: 40 }}>
                              <span style={{ ...legendPct, color: row.color }}>{row.pctInt}%</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    ))}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Breakdown — Gasto Calórico + Ajuste = Calorías */}
          <Section style={padX}>
            <Heading as="h3" style={h3}>Cómo calculamos tus calorías</Heading>
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
              <tbody>
                <tr>
                  <td style={breakdownCell} align="center">
                    <div style={{ ...hexBadge, background: COLORS.teal }}>
                      <span style={hexBolt}>♻</span>
                    </div>
                    <Text style={breakdownStepLabel}>Gasto calórico</Text>
                    <Text style={breakdownStepValue}>{gastoKcal.toLocaleString('es-MX')}<span style={breakdownStepUnit}> kcal</span></Text>
                  </td>
                  <td style={breakdownOp} align="center">+</td>
                  <td style={breakdownCell} align="center">
                    <div style={{ ...hexBadge, background: COLORS.teal }}>
                      <span style={hexBolt}>{adj.operator}</span>
                    </div>
                    <Text style={breakdownStepLabel}>Ajuste</Text>
                    <Text style={breakdownStepValue}>{adj.kcal.toLocaleString('es-MX')}<span style={breakdownStepUnit}> kcal</span></Text>
                  </td>
                  <td style={breakdownOp} align="center">=</td>
                  <td style={breakdownResultCell} align="center">
                    <div style={breakdownResultBox}>
                      <Text style={breakdownResultLabel}>Calorías diarias</Text>
                      <Text style={breakdownResultValue}>{result.calories.toLocaleString('es-MX')}</Text>
                      <Text style={breakdownResultUnit}>kcal/día</Text>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <Text style={breakdownBmrNote}>
              Tu gasto calórico parte de tu <strong>metabolismo basal (BMR): {result.bmr.toLocaleString('es-MX')} kcal/día</strong>, multiplicado por tu nivel de actividad.
            </Text>
          </Section>

          {/* Tus datos */}
          <Section style={padX}>
            <Heading as="h3" style={h3}>Tus datos</Heading>
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
              <tbody>
                {inputsSummary(inputs).map((row) => (
                  <tr key={row.label}>
                    <td style={recapLabel}>{row.label}</td>
                    <td style={recapValue}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* Disclaimer + calibration */}
          <Section style={padX}>
            <Text style={disclaimerBold}>{ESTIMATE_DISCLAIMER}</Text>
            <Text style={calibration}>{CALIBRATION_MESSAGE}</Text>
          </Section>

          {/* CTA banner — grad-cap + button */}
          <Section style={{ ...padX, paddingTop: 8, paddingBottom: 8 }}>
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
              <tbody>
                <tr>
                  <td style={ctaBanner}>
                    <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
                      <tbody>
                        <tr>
                          <td style={{ verticalAlign: 'middle' }}>
                            <table cellPadding={0} cellSpacing={0} role="presentation">
                              <tbody>
                                <tr>
                                  <td style={{ verticalAlign: 'middle' }}>
                                    <div style={{ ...hexBadge, border: `1.5px solid ${COLORS.cyan}`, background: 'transparent' }}>
                                      <span style={{ ...hexBolt, fontSize: 18 }}>🎓</span>
                                    </div>
                                  </td>
                                  <td style={{ verticalAlign: 'middle', paddingLeft: 12 }}>
                                    <Text style={ctaInscribe}>Inscríbete al</Text>
                                    <Text style={ctaCourse}>Curso de Fundamentos</Text>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                          <td style={{ verticalAlign: 'middle', textAlign: 'right' as const }}>
                            <Button href={COURSE_CTA_URL} style={ctaButton}>QUIERO INSCRIBIRME</Button>
                            <Text style={ctaWaitlist}>Lista de espera abierta</Text>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Footer */}
          <Section style={{ ...padX, paddingTop: 16, paddingBottom: 24 }}>
            <Hr style={hr} />
            <Text style={footer}>
              No constituye diagnóstico ni reemplaza la valoración clínica individual.
              Si tienes condiciones médicas o tomas medicamentos, consulta con un profesional antes de aplicar este plan.
            </Text>
            <Text style={footerBrand}>Entrena con Ciencia · entrenaconciencia.com</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/* ────────────────────────── styles ────────────────────────── */

const containerStyle = {
  maxWidth: 600,
  margin: '0 auto',
  background: COLORS.white,
  borderRadius: 12,
  overflow: 'hidden' as const,
  boxShadow: '0 4px 24px rgba(1,13,21,0.08)',
};

const headerStyle = {
  background: `linear-gradient(180deg, #0E6E91 0%, ${COLORS.teal} 55%, #013B4F 100%)`,
  padding: '32px 32px 28px',
  textAlign: 'center' as const,
};

const brandLogo = {
  display: 'block',
  margin: '0 auto 12px',
};

const brandTitleCyan = {
  color: COLORS.cyan,
  fontSize: 24,
  fontWeight: 800,
  margin: 0,
  lineHeight: 1.15,
};

const brandTitleYellow = {
  color: COLORS.yellow,
  fontSize: 24,
  fontWeight: 800,
  margin: '2px 0 0',
  lineHeight: 1.15,
};

const padX = { padding: '20px 32px' };

const greeting = { color: COLORS.teal, fontSize: 17, fontWeight: 700, margin: '0 0 10px' };

const objectivePill = {
  border: `1px solid ${COLORS.cyan}`,
  borderRadius: 10,
  padding: '12px 16px',
};
const objectiveText = { color: COLORS.teal, fontSize: 14, lineHeight: 1.5, margin: 0 };

/* Macro donut legend */
const legendName  = { color: COLORS.teal, fontSize: 14, fontWeight: 700, margin: 0, lineHeight: 1.2 };
const legendRange = { color: COLORS.textMuted, fontSize: 10, margin: '1px 0 0', lineHeight: 1.2 };
const legendGrams = { color: COLORS.cyan, fontSize: 15, fontWeight: 700 };
const legendUnit  = { color: COLORS.teal, fontSize: 11 };
const legendPct   = { color: COLORS.cyan, fontSize: 14, fontWeight: 700 };

const h3 = { color: COLORS.teal, fontSize: 17, fontWeight: 700, margin: '8px 0 12px' };

/* Breakdown — Gasto Calórico + Ajuste = Calorías */
const HEX_FLAT = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
const hexBadge = {
  width: 58,
  height: 58,
  display: 'inline-block',
  textAlign: 'center' as const,
  lineHeight: '58px',
  clipPath: HEX_FLAT,
  WebkitClipPath: HEX_FLAT,
};
const hexBolt = { color: COLORS.white, fontSize: 22, lineHeight: '58px', fontWeight: 700 };
const breakdownCell = { textAlign: 'center' as const, verticalAlign: 'top' as const, width: '26%' };
const breakdownOp = { fontSize: 26, fontWeight: 700, color: COLORS.navy, verticalAlign: 'middle' as const, width: '6%' };
const breakdownStepLabel = { color: COLORS.teal, fontSize: 12, fontWeight: 700, margin: '7px 0 0' };
const breakdownStepValue = { color: COLORS.cyan, fontSize: 14, fontWeight: 700, margin: '2px 0 0' };
const breakdownStepUnit = { color: COLORS.textMuted, fontSize: 11, fontWeight: 400 };
const breakdownResultCell = { textAlign: 'center' as const, verticalAlign: 'middle' as const, width: '30%' };
const breakdownResultBox = { background: COLORS.white, border: `1.5px solid ${COLORS.cyan}`, borderRadius: 10, padding: '12px 8px' };
const breakdownResultLabel = { color: COLORS.teal, fontSize: 10, fontWeight: 700, margin: 0 };
const breakdownResultValue = { color: COLORS.cyan, fontSize: 24, fontWeight: 800, margin: '2px 0 0', lineHeight: 1 };
const breakdownResultUnit = { color: COLORS.teal, fontSize: 10, margin: '3px 0 0' };
const breakdownBmrNote = { color: COLORS.textMuted, fontSize: 12, lineHeight: 1.5, textAlign: 'center' as const, margin: '14px 0 0' };

const warningTitle = { fontSize: 14, fontWeight: 700, margin: '0 0 4px' };
const warningBody  = { color: COLORS.textDark, fontSize: 13, lineHeight: 1.5, margin: 0 };

const disclaimerBold = { color: COLORS.textDark, fontSize: 13, lineHeight: 1.5, fontWeight: 700, textAlign: 'center' as const, margin: '0 0 8px' };
const calibration = { color: COLORS.textMuted, fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' as const, textAlign: 'center' as const, margin: 0 };

/* CTA banner */
const ctaBanner = {
  background: COLORS.navy,
  border: `1px solid rgba(35,211,255,0.35)`,
  borderRadius: 12,
  padding: '16px 18px',
};
const ctaInscribe = { color: COLORS.white, fontSize: 14, fontWeight: 700, margin: 0 };
const ctaCourse = { color: COLORS.cyan, fontSize: 16, fontWeight: 800, margin: '1px 0 0' };
const ctaButton = {
  background: COLORS.yellow,
  color: COLORS.navy,
  fontWeight: 700,
  fontSize: 13,
  padding: '12px 18px',
  borderRadius: 8,
  textDecoration: 'none',
  display: 'inline-block',
};
const ctaWaitlist = { color: COLORS.cyanSoft, fontSize: 11, margin: '6px 0 0', textAlign: 'right' as const };

const hr = { borderColor: '#e3eaef', margin: '12px 0' };

const recapLabel = { color: COLORS.teal, fontSize: 13, padding: '6px 0', width: '45%' };
const recapValue = { color: COLORS.navy, fontSize: 13, padding: '6px 0', fontWeight: 700 };

const footer      = { color: COLORS.textMuted, fontSize: 11, lineHeight: 1.5, margin: '8px 0' };
const footerBrand = { color: COLORS.teal, fontSize: 12, fontWeight: 700, margin: 0 };
