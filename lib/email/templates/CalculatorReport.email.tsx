import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { COLORS, FONT_STACK, COURSE_CTA_URL } from '../brand';
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

export default function CalculatorReportEmail({ name, inputs, result }: ReportProps) {
  const goalTitle = goalLabels[inputs.goal].title;

  return (
    <Html lang="es">
      <Head />
      <Preview>{`Tu reporte personalizado: ${result.calories} kcal/día`}</Preview>
      <Body style={{ background: COLORS.offwhite, fontFamily: FONT_STACK, margin: 0, padding: 0 }}>
        <Container style={containerStyle}>
          {/* Header band */}
          <Section style={headerStyle}>
            <Text style={brandWordmark}>Entrena con Ciencia</Text>
            <Text style={headerTitle}>Tu reporte personalizado</Text>
          </Section>

          {/* Greeting */}
          <Section style={padX}>
            <Text style={greeting}>Hola, {name} —</Text>
            <Text style={lead}>
              Esto es lo que calculamos para tu objetivo de <strong>{goalTitle.toLowerCase()}</strong>.
              Adjuntamos también un PDF con el reporte completo para que lo guardes.
            </Text>
          </Section>

          {/* Calorie hero */}
          <Section style={{ ...padX, paddingTop: '8px', paddingBottom: '8px' }}>
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
              <tbody>
                <tr>
                  <td style={heroCard}>
                    <Text style={heroLabel}>Calorías diarias</Text>
                    <Text style={heroNumber}>{result.calories.toLocaleString('es-MX')}</Text>
                    <Text style={heroUnit}>kcal/día</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Macros */}
          <Section style={padX}>
            <Heading as="h3" style={h3}>Macronutrientes</Heading>
            {macroRows(result).map((row) => (
              <table key={row.label} width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ marginBottom: 10 }}>
                <tbody>
                  <tr>
                    <td style={{ width: '40%', color: COLORS.textDark, fontWeight: 600, fontSize: 14 }}>{row.label}</td>
                    <td style={{ width: '35%', color: COLORS.textDark, fontSize: 14 }}>{row.grams} g</td>
                    <td style={{ width: '25%', color: COLORS.textMuted, fontSize: 13, textAlign: 'right' as const }}>{pctLabel(row.pct)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} style={{ paddingTop: 4 }}>
                      <div style={{ height: 6, borderRadius: 3, background: '#eef3f6' }}>
                        <div style={{ height: 6, borderRadius: 3, background: row.color, width: `${Math.round(row.pct * 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            ))}
          </Section>

          {/* Breakdown */}
          <Section style={padX}>
            <Heading as="h3" style={h3}>Cómo llegamos a esto</Heading>
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={breakdownTable}>
              <tbody>
                <tr><td style={breakdownLabel}>Metabolismo basal (BMR)</td><td style={breakdownValue}>{result.bmr.toLocaleString('es-MX')} kcal</td></tr>
                <tr><td style={breakdownLabel}>Gasto diario (TDEE)</td><td style={breakdownValue}>{result.tdee.toLocaleString('es-MX')} kcal</td></tr>
                <tr><td style={breakdownLabel}>Ajuste por objetivo</td><td style={breakdownValue}>{goalAdjustmentLabel(inputs.goal, inputs.weight)}</td></tr>
                <tr><td style={{ ...breakdownLabel, fontWeight: 700, color: COLORS.navy }}>Objetivo diario</td><td style={{ ...breakdownValue, fontWeight: 700, color: COLORS.navy }}>{result.calories.toLocaleString('es-MX')} kcal</td></tr>
              </tbody>
            </table>
          </Section>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <Section style={padX}>
              {result.warnings.map((w) => {
                const copy = WARNING_COPY[w];
                if (!copy) return null;
                const palette = copy.tone === 'danger'
                  ? { bg: COLORS.dangerBg, bar: COLORS.dangerBar }
                  : { bg: COLORS.warnBg, bar: COLORS.warnBar };
                return (
                  <table key={w} width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ marginBottom: 12 }}>
                    <tbody>
                      <tr>
                        <td style={{ background: palette.bg, borderLeft: `4px solid ${palette.bar}`, padding: '12px 14px', borderRadius: 6 }}>
                          <Text style={{ ...warningTitle, color: palette.bar }}>{copy.title}</Text>
                          <Text style={warningBody}>{copy.body}</Text>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                );
              })}
            </Section>
          )}

          {/* Calibration */}
          <Section style={padX}>
            <Text style={calibration}>{CALIBRATION_MESSAGE}</Text>
          </Section>

          {/* CTA */}
          <Section style={{ ...padX, textAlign: 'center' as const, paddingTop: 8, paddingBottom: 8 }}>
            <Button href={COURSE_CTA_URL} style={ctaButton}>
              Inscribirme al curso de Fundamentos
            </Button>
            <Text style={ctaHint}>Únete a la lista de espera y accede a precio fundador.</Text>
          </Section>

          {/* Inputs recap */}
          <Section style={padX}>
            <Hr style={hr} />
            <Heading as="h3" style={{ ...h3, marginTop: 8 }}>Lo que ingresaste</Heading>
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
  background: `linear-gradient(180deg, ${COLORS.navyTop} 0%, ${COLORS.navy} 100%)`,
  padding: '32px 32px 28px',
  textAlign: 'center' as const,
};

const brandWordmark = {
  color: COLORS.cyan,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 2,
  textTransform: 'uppercase' as const,
  margin: 0,
};

const headerTitle = {
  color: COLORS.white,
  fontSize: 26,
  fontWeight: 800,
  margin: '8px 0 0',
  lineHeight: 1.2,
};

const padX = { padding: '20px 32px' };

const greeting = { color: COLORS.navy, fontSize: 16, fontWeight: 700, margin: '0 0 8px' };
const lead     = { color: COLORS.textDark, fontSize: 15, lineHeight: 1.55, margin: 0 };

const heroCard = {
  background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navy2} 100%)`,
  borderRadius: 12,
  padding: '24px 20px',
  textAlign: 'center' as const,
};
const heroLabel  = { color: COLORS.cyanSoft, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, margin: 0 };
const heroNumber = { color: COLORS.cyan, fontSize: 48, fontWeight: 800, margin: '4px 0 0', lineHeight: 1 };
const heroUnit   = { color: COLORS.white, fontSize: 14, margin: '4px 0 0' };

const h3 = { color: COLORS.navy, fontSize: 16, fontWeight: 700, margin: '8px 0 12px' };

const breakdownTable = { background: COLORS.offwhite, borderRadius: 8, padding: 12 };
const breakdownLabel = { color: COLORS.textMuted, fontSize: 13, padding: '6px 12px' };
const breakdownValue = { color: COLORS.textDark, fontSize: 14, padding: '6px 12px', textAlign: 'right' as const, fontWeight: 600 };

const warningTitle = { fontSize: 14, fontWeight: 700, margin: '0 0 4px' };
const warningBody  = { color: COLORS.textDark, fontSize: 13, lineHeight: 1.5, margin: 0 };

const calibration = { color: COLORS.textMuted, fontSize: 13, lineHeight: 1.55, fontStyle: 'italic' as const, margin: '8px 0' };

const ctaButton = {
  background: COLORS.yellow,
  color: COLORS.navy,
  fontWeight: 700,
  fontSize: 15,
  padding: '14px 28px',
  borderRadius: 999,
  textDecoration: 'none',
  display: 'inline-block',
};
const ctaHint = { color: COLORS.textMuted, fontSize: 12, marginTop: 10 };

const hr = { borderColor: '#e3eaef', margin: '12px 0' };

const recapLabel = { color: COLORS.textMuted, fontSize: 13, padding: '6px 0', width: '45%' };
const recapValue = { color: COLORS.textDark, fontSize: 13, padding: '6px 0', fontWeight: 600 };

const footer      = { color: COLORS.textMuted, fontSize: 11, lineHeight: 1.5, margin: '8px 0' };
const footerBrand = { color: COLORS.teal, fontSize: 12, fontWeight: 700, margin: 0 };
