declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      track: (event: string, data?: Record<string, unknown>) => void;
      page: () => void;
      load: (id: string) => void;
    };
  }
}

/**
 * Fire a conversion event to Meta Pixel and TikTok Pixel simultaneously.
 *
 * Each platform uses its own standard event names — pass both. Calls are
 * no-ops when the corresponding pixel hasn't loaded (env var not set).
 *
 * Standard event mappings used in this codebase:
 *   Resource / course modal submit → Meta `Lead`,                TikTok `Subscribe`
 *   Calculator completed           → Meta `CompleteRegistration`, TikTok `CompleteRegistration`
 */
export function fireConversionEvent(
  meta: string,
  tiktok: string,
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
  } catch {}
}
