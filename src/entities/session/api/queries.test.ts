import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { configureApi, resetApiContext } from '@/shared/api/httpContext'
import { setMockSession } from '@/shared/api/mocks/handlers'
import { server } from '@/shared/api/mocks/server'
import { fetchSession } from './queries'

/**
 * Runs against the MSW handlers rather than a stubbed fetch, so the real
 * httpClient is exercised: the tenant header, DRF error normalisation and the
 * 401 hand-off all have to actually work.
 */
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetApiContext()
  setMockSession(null)
})
afterAll(() => server.close())

describe('fetchSession', () => {
  beforeEach(() => setMockSession('admin'))

  it('maps the wire shape to the domain shape', async () => {
    const session = await fetchSession()

    expect(session.firstName).toBe('Dilnoza')
    expect(session.role).toBe('ClinicAdmin')
    expect(session.clinics).toHaveLength(2)
    expect(session.activeClinicId).toBe(session.clinics[0]?.id)
  })

  it('turns permissions into a set for lookup', async () => {
    const session = await fetchSession()

    expect(session.permissions.has('patient:archive')).toBe(true)
    expect(session.permissions.has('billing:write')).toBe(true)
  })

  it('carries only the permissions the server granted', async () => {
    setMockSession('doctor')
    const session = await fetchSession()

    // A doctor may write records but not archive patients or touch billing.
    expect(session.permissions.has('medical-record:write')).toBe(true)
    expect(session.permissions.has('patient:archive')).toBe(false)
    expect(session.permissions.has('billing:write')).toBe(false)
  })

  it('ignores a permission it does not recognise instead of refusing to load', async () => {
    server.use(
      http.get('/api/me/', () =>
        HttpResponse.json({
          id: 'a1b2c3d4-0000-4000-8000-000000000001',
          first_name: 'Dilnoza',
          last_name: 'Rahimova',
          email: 'a@example.test',
          role: 'ClinicAdmin',
          // The backend may ship a new permission before this frontend does.
          permissions: ['patient:read', 'lab:order'],
          clinics: [],
          active_clinic_id: null,
        }),
      ),
    )

    const session = await fetchSession()

    expect(session.permissions.has('patient:read')).toBe(true)
    expect(session.permissions.size).toBe(1)
  })

  it('fails loudly when the contract is broken', async () => {
    server.use(
      http.get('/api/me/', () =>
        HttpResponse.json({
          id: 'a1b2c3d4-0000-4000-8000-000000000001',
          first_name: 'Dilnoza',
          last_name: 'Rahimova',
          email: 'a@example.test',
          role: 'ClinicAdmin',
          // `permissions` dropped by a serializer change. Rendering an empty
          // sidebar would look like "this user may do nothing" — an error is
          // the honest outcome.
          clinics: [],
          active_clinic_id: null,
        }),
      ),
    )

    await expect(fetchSession()).rejects.toThrow()
  })

  it('rejects a sequential id, which §5.4 forbids', async () => {
    server.use(
      http.get('/api/me/', () =>
        HttpResponse.json({
          id: '1',
          first_name: 'A',
          last_name: 'B',
          email: 'a@example.test',
          role: 'Doctor',
          permissions: [],
          clinics: [],
          active_clinic_id: null,
        }),
      ),
    )

    await expect(fetchSession()).rejects.toThrow()
  })
})

describe('when the session is gone', () => {
  it('reports unauthorized and hands off exactly once', async () => {
    const onUnauthorized = vi.fn()
    configureApi({ onUnauthorized })
    setMockSession(null)

    await expect(fetchSession()).rejects.toBeInstanceOf(ApiError)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('does not retry a 401', async () => {
    let calls = 0
    server.use(
      http.get('/api/me/', () => {
        calls += 1
        return HttpResponse.json({ detail: 'unauthorized' }, { status: 401 })
      }),
    )
    configureApi({ onUnauthorized: () => {} })

    await expect(fetchSession()).rejects.toBeInstanceOf(ApiError)
    // ADR-003: no refresh flow, so a retry would only delay the redirect.
    expect(calls).toBe(1)
  })
})

describe('tenant header', () => {
  it('sends the active clinic on every request', async () => {
    const seen: (string | null)[] = []
    server.use(
      http.get('/api/me/', ({ request }) => {
        seen.push(request.headers.get('X-Clinic-Id'))
        return HttpResponse.json({
          id: 'a1b2c3d4-0000-4000-8000-000000000001',
          first_name: 'A',
          last_name: 'B',
          email: 'a@example.test',
          role: 'Doctor',
          permissions: [],
          clinics: [],
          active_clinic_id: null,
        })
      }),
    )
    configureApi({ getClinicId: () => '4f7b2e91-3a5c-4d18-9f60-1c2a8b7d4e33' })

    await fetchSession()

    expect(seen).toEqual(['4f7b2e91-3a5c-4d18-9f60-1c2a8b7d4e33'])
  })
})
