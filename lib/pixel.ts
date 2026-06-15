declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      track: (event: string, data?: Record<string, unknown>) => void;
      page: () => void;
      load: (id: string) => void;
    };
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Fire a conversion event to Meta Pixel, TikTok Pixel, and GA4 simultaneously.
 *
 * Each platform uses its own event-name conventions — pass all three. Calls
 * are no-ops when the corresponding pixel hasn't loaded (env var not set).
 *
 * Standard event mappings used in this codebase:
 *   Resource / course modal submit → Meta `Lead`,                 TikTok `Subscribe`,           GA4 `generate_lead`
 *   Calculator completed           → Meta `CompleteRegistration`, TikTok `CompleteRegistration`, GA4 `calculator_complete`
 */
export function fireConversionEvent(
  meta: string,
  tiktok: string,
  ga: string,
  data?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', meta, data ?? {});
    }
    if (window.ttq) {
      window.ttq.track(tiktok, data ?? {});
    }
    if (typeof window.gtag === 'function') {
      window.gtag('event', ga, data ?? {});
    }
  } catch {}
}
