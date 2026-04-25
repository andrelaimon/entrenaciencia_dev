# TODO — Entrena con Ciencia

## Calculadora
- [ ] Expandir la calculadora inspirándose en https://iifym.com/
- [ ] Solicitar correo y WhatsApp para enviar los resultados al usuario
- [ ] Recopilar información detallada del usuario en la calculadora: edad, peso, altura, sexo, nivel de actividad, objetivo
- [ ] Enviar los datos de la calculadora a Supabase (nueva tabla, p.ej. `calculator_submissions`) para tener un registro completo de cada uso

## Analytics y tracking
- [ ] Integrar Vercel Analytics y Vercel Speed Insights (gratis, sin cookies)
- [ ] Integrar Google Analytics 4 (GA4) — país, tiempo en página, fuentes de tráfico, bounce rate, etc.
- [ ] Integrar Meta Pixel para tracking de campañas de Facebook / Instagram ads
- [ ] Configurar eventos personalizados (en GA4 y Meta Pixel):
  - Apertura del modal de captura de leads
  - Envío exitoso del formulario (con `source` del recurso)
  - Inicio y finalización de la calculadora
  - Click en "Notificarme" del curso
- [ ] Banner de consentimiento de cookies (requerido al usar GA4 / Meta Pixel)
- [ ] Política de privacidad y términos de uso

## Integraciones de marketing
- [ ] Integrar Klaviyo para email marketing
  - Envío automático del PDF cuando un lead se registra
  - Secuencia de bienvenida tras el registro
  - Seguimiento por email a leads que no convierten
- [ ] Integrar ManyChat para automatización por WhatsApp
  - Mensaje de bienvenida automático al recibir un nuevo lead
  - Conversaciones automatizadas con los leads
  - Sincronización de leads entre Supabase, Klaviyo y ManyChat
