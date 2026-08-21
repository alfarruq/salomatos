/**
 * The two things the HTTP client needs from the rest of the app, injected
 * rather than imported.
 *
 * §5.2 sketches `httpClient` reading `useSessionStore` directly, but that store
 * lives in `entities/session` and `shared` may not import upwards (§3.3) — the
 * boundaries linter rejects it. Inverting the dependency keeps the rule intact
 * and, usefully, makes the client trivial to drive from a test.
 */

interface ApiContext {
  /** Tenant header for every request. Backend re-checks it — this is not security. */
  getClinicId: () => string | null
  /**
   * Called once when the server says the session is gone. Per ADR-003 the web
   * client uses Django session auth and has no refresh flow, so this is a hard
   * logout: clear the cache, send the user to /login.
   */
  onUnauthorized: () => void
}

const noop: ApiContext = {
  getClinicId: () => null,
  onUnauthorized: () => {},
}

let context: ApiContext = noop

export function configureApi(next: Partial<ApiContext>): void {
  context = { ...context, ...next }
}

/** Restores the defaults. For tests. */
export function resetApiContext(): void {
  context = noop
}

export function getApiContext(): ApiContext {
  return context
}
