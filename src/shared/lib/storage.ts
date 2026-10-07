/**
 * The only place this app touches Web Storage (§3/§10).
 *
 * The allowlist is the security boundary: a key that is not in `KEYS` cannot
 * be persisted, because `set`/`get`/`remove` have no way to address it. Never
 * call `localStorage` directly elsewhere. PHI and the user's profile stay
 * RAM-only regardless — only the locale and the two auth tokens are safe to
 * survive a reload (ADR `auth-session-storage`, revises ADR-003).
 */
const KEYS = {
  locale: 'salomat:locale',
  accessToken: 'salomat:access_token',
  refreshToken: 'salomat:refresh_token',
} as const

type StorageKey = keyof typeof KEYS

export const storage = {
  get(key: StorageKey): string | null {
    try {
      return localStorage.getItem(KEYS[key])
    } catch {
      // Storage can be unavailable (private mode, blocked site data) — fall back to RAM-only.
      return null
    }
  },
  set(key: StorageKey, value: string): void {
    try {
      localStorage.setItem(KEYS[key], value)
    } catch {
      // See get(): losing persistence must not break the app.
    }
  },
  remove(key: StorageKey): void {
    try {
      localStorage.removeItem(KEYS[key])
    } catch {
      // See get().
    }
  },
}
