const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
type UtmKey = typeof UTM_KEYS[number];
export type UtmParams = Partial<Record<UtmKey, string>>;

const KEY_LAST_TOUCH = '_utm';        // sessionStorage — last-touch (current session)
const KEY_FIRST_TOUCH = '_utm_first'; // localStorage — first-touch (set once forever)

export function captureUtm(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const utm: UtmParams = {};
  UTM_KEYS.forEach((key) => {
    const val = params.get(key);
    if (val) utm[key] = val;
  });
  if (Object.keys(utm).length === 0) return;

  try {
    // Last-touch: always overwrite
    sessionStorage.setItem(KEY_LAST_TOUCH, JSON.stringify(utm));
    // First-touch: set once, never overwrite
    if (!localStorage.getItem(KEY_FIRST_TOUCH)) {
      localStorage.setItem(KEY_FIRST_TOUCH, JSON.stringify(utm));
    }
  } catch {}
}

export function getStoredUtm(): UtmParams {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(KEY_LAST_TOUCH);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getFirstTouchUtm(): UtmParams {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(KEY_FIRST_TOUCH);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Returns last-touch UTMs spread + first_touch_utm_* fields, ready to spread into a request body. */
export function getAllAttribution() {
  const last = getStoredUtm();
  const first = getFirstTouchUtm();
  return {
    utm_source:               last.utm_source ?? null,
    utm_medium:               last.utm_medium ?? null,
    utm_campaign:             last.utm_campaign ?? null,
    utm_content:              last.utm_content ?? null,
    utm_term:                 last.utm_term ?? null,
    first_touch_utm_source:   first.utm_source ?? null,
    first_touch_utm_medium:   first.utm_medium ?? null,
    first_touch_utm_campaign: first.utm_campaign ?? null,
    first_touch_utm_content:  first.utm_content ?? null,
    first_touch_utm_term:     first.utm_term ?? null,
  };
}
