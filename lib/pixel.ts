declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function firePixelEvent(event: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', event, data ?? {});
}
