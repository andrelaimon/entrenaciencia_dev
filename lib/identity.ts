// Persistent anonymous device ID + 30-min-idle session tracking.
// All values are namespaced with leading underscores in storage.

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const KEY_AID = '_aid';
const KEY_SID = '_sid';
const KEY_SLA = '_sla'; // session last-activity timestamp

export function getAnonymousId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem(KEY_AID);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY_AID, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const now = Date.now();
    const stored = localStorage.getItem(KEY_SID);
    const lastActivity = parseInt(localStorage.getItem(KEY_SLA) ?? '0', 10);

    if (stored && now - lastActivity < SESSION_TIMEOUT_MS) {
      localStorage.setItem(KEY_SLA, String(now));
      return stored;
    }

    const newId = crypto.randomUUID();
    localStorage.setItem(KEY_SID, newId);
    localStorage.setItem(KEY_SLA, String(now));
    return newId;
  } catch {
    return '';
  }
}
