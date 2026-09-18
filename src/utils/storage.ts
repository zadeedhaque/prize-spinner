/**
 * Thin localStorage wrapper. The app must work perfectly with storage
 * unavailable (private browsing, disabled storage, quota errors) so every
 * call is guarded and failures are swallowed rather than surfaced.
 */
export function loadValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore — persistence is a nice-to-have, not a requirement.
  }
}
