/**
 * The access token, held in a module variable and nowhere else.
 *
 * ⛔ Not `localStorage`, not `sessionStorage`, not a cookie this code writes.
 * §13.2 and ADR-007: the reception desk machine is shared, and a token left in
 * browser storage outlives the shift that created it — the next member of
 * staff, or any script that gets injected into the page, inherits a working
 * session. RAM is the only place it may live.
 *
 * The cost is real and intended: a page reload signs the user out, because the
 * token genuinely is gone. The backend returns tokens in the response body
 * (`UserService.login`), so there is no httpOnly cookie to fall back on. Making
 * refresh survivable requires the server to set the cookie itself — a backend
 * change, deliberately not made here.
 *
 * There is no refresh flow either: the backend exposes `login/`, `me/` and
 * `update/<pk>/` and no token refresh route at all, so the `refresh_token` it
 * hands out has nowhere to be sent. A 401 is therefore terminal (see
 * `httpClient`).
 *
 * A plain variable rather than a store: nothing renders from it. React reads
 * the session from the query cache; this is only for the request layer.
 */

let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

export function clearAccessToken(): void {
  accessToken = null
}
