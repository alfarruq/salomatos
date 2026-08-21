import type { JsonBodyType } from 'msw'
import { HttpResponse, http } from 'msw'
import { MOCK_PASSWORD, MOCK_USERS, type MockUserKey } from './fixtures'

/**
 * Stands in for Django until `/api/schema/` exists.
 *
 * These handlers deliberately reproduce the *shape* of the real contract —
 * session cookie auth (ADR-003), DRF error bodies (§5.3), `X-Request-Id` on
 * every response (§5.4) — so the code written against them does not have to
 * change when the backend arrives. Only this directory does.
 */

/** Stands in for the session cookie Django would set. Mock-only. */
let signedInAs: MockUserKey | null = null

export function setMockSession(user: MockUserKey | null): void {
  signedInAs = user
}

function withRequestId(body: JsonBodyType, init: ResponseInit = {}) {
  return HttpResponse.json(body, {
    ...init,
    headers: { ...init.headers, 'X-Request-Id': `mock_${crypto.randomUUID().slice(0, 8)}` },
  })
}

export const handlers = [
  /**
   * §9 — the single source of truth for who the user is and what they may do.
   * The frontend never derives permissions from the role.
   */
  http.get('/api/me/', () => {
    if (signedInAs === null) {
      return withRequestId({ detail: 'Autentifikatsiya ma`lumotlari berilmagan.' }, { status: 401 })
    }
    return withRequestId(MOCK_USERS[signedInAs])
  }),

  http.post('/api/auth/login/', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string
      password?: string
    }

    const match = (Object.keys(MOCK_USERS) as MockUserKey[]).find(
      (key) => MOCK_USERS[key].email === body.email,
    )

    if (match === undefined || body.password !== MOCK_PASSWORD) {
      // DRF's shape for a credential failure: not tied to a single field.
      return withRequestId({ non_field_errors: ['Email yoki parol xato.'] }, { status: 400 })
    }

    signedInAs = match
    return withRequestId(MOCK_USERS[match])
  }),

  http.post('/api/auth/logout/', () => {
    signedInAs = null
    return new HttpResponse(null, { status: 204 })
  }),

  /**
   * Switching clinics is a server-side change of scope, not just a client
   * preference — the backend has to agree before the frontend clears its cache.
   */
  http.post('/api/me/active-clinic/', async ({ request }) => {
    if (signedInAs === null) {
      return withRequestId({ detail: 'Autentifikatsiya talab qilinadi.' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as { clinic_id?: string }
    const user = MOCK_USERS[signedInAs]
    const clinic = user.clinics.find((entry) => entry.id === body.clinic_id)

    if (clinic === undefined) {
      return withRequestId({ clinic_id: ['Bunday klinika mavjud emas.'] }, { status: 400 })
    }

    return withRequestId({ ...user, active_clinic_id: clinic.id })
  }),
]
