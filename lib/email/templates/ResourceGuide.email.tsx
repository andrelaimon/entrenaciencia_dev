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
import { COLORS, FONT_STACK, SITE_URL } from '../brand';

interface ResourceGuideEmailProps {
  name: string;
  guideTitle: string;
  downloadUrl: string;
}

export default function ResourceGuideEmail({ name, guideTitle, downloadUrl }: ResourceGuideEmailProps) {
  const firstName = name.split(' ')[0];

  return (
    <Html>
      <Head />
      <Preview>Aquí está tu guía: {guideTitle} — Entrena con Ciencia</Preview>
      <Body style={{ backgroundColor: COLORS.offwhite, fontFamily: FONT_STACK, margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px' }}>

          {/* Header */}
          <Section style={{
            backgroundColor: COLORS.navy,
            borderRadius: '16px 16px 0 0',
            padding: '28px 40px',
            textAlign: 'center',
          }}>
            <Img
              src={`${SITE_URL}/images/isotipo-cyan.png`}
              width={48}
              height={48}
              alt="Entrena con Ciencia"
              style={{ margin: '0 auto 12px' }}
            />
            <Text style={{ color: COLORS.cyan, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>
              Entrena con Ciencia
            </Text>
          </Section>

          {/* Body */}
          <Section style={{
            backgroundColor: COLORS.white,
            padding: '36px 40px',
            borderLeft: `1px solid ${COLORS.offwhite}`,
            borderRight: `1px solid ${COLORS.offwhite}`,
          }}>
            <Heading style={{ fontSize: 22, fontWeight: 800, color: COLORS.navy, margin: '0 0 8px' }}>
              ¡Hola, {firstName}!
            </Heading>
            <Text style={{ fontSize: 15, color: COLORS.textDark, lineHeight: 1.6, margin: '0 0 24px' }}>
              Tu guía <strong>{guideTitle}</strong> está lista. Haz clic abajo para descargarla:
            </Text>

            <Button
              href={downloadUrl}
              style={{
                backgroundColor: COLORS.cyan,
                color: COLORS.navy,
                fontWeight: 800,
                fontSize: 15,
                padding: '16px 32px',
                borderRadius: 8,
                display: 'inline-block',
              }}
            >
              Descargar guía →
            </Button>

            <Text style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6, margin: '20px 0 28px' }}>
              Está basada en evidencia científica actual — sin mitos, sin fórmulas mágicas. Léela a tu ritmo y aplica lo que funciona para tu cuerpo.
            </Text>

            <Hr style={{ borderColor: COLORS.offwhite, margin: '0 0 24px' }} />

            <Text style={{ fontSize: 14, color: COLORS.textMuted, margin: '0 0 16px' }}>
              Complementa la guía con tu plan exacto de calorías y macros:
            </Text>

            <Button
              href={`${SITE_URL}/calculadora`}
              style={{
                backgroundColor: COLORS.yellow,
                color: COLORS.navy,
                fontWeight: 800,
                fontSize: 14,
                padding: '14px 28px',
                borderRadius: 8,
                display: 'inline-block',
              }}
            >
              Calcular mis macros →
            </Button>
          </Section>

          {/* Footer */}
          <Section style={{
            backgroundColor: COLORS.navy,
            borderRadius: '0 0 16px 16px',
            padding: '24px 40px',
            textAlign: 'center',
          }}>
            <Text style={{ fontSize: 12, color: COLORS.textMuted, margin: '0 0 4px' }}>
              © {new Date().getFullYear()} Entrena con Ciencia
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted, margin: 0 }}>
              Recibiste este correo porque solicitaste un recurso gratuito.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
