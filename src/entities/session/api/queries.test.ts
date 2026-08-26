import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { configureApi, resetApiContext } from '@/shared/api/httpContext'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { fetchSession } from './queries'

/**
 * Runs against the MSW handlers rather than a stubbed fetch, so the real
 * httpClient is exercised: the bearer header, the error envelope and the 401
 * hand-off all have to actually work.
 */
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetApiContext()
  clearAccessToken()
})
afterAll(() => server.close())

/** The eight fields `UserMeSerializer` actually returns. */
const ME_RESPONSE = {
  full_name: 'Dilnoza Rahimova',
  specialty: null,
  phone_number: '+998901112233',
  email: 'clinic@example.test',
  experience: null,
  biography: null,
  image: null,
  role: 'superadmin',
}

describe('fetchSession', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('maps the wire shape to the domain shape', async () => {
    const session = await fetchSession()

    expect(session.fullName).toBe('Dilnoza Rahimova')
    expect(session.role).toBe('superadmin')
    expect(session.phoneNumber).toBe('+998901112233')
  })

  it('takes the user id from the token, because the response has none', async () => {
    const session = await fetchSession()

    expect(session.userId).toBe(1)
    // §6.2 — this is what every query key is scoped by.
    expect(session.clinicId).toBe(1)
  })

  it('derives permissions from the role (ADR-012)', async () => {
    const session = await fetchSession()

    expect(session.permissions.has('billing:write')).toBe(true)
    expect(session.permissions.has('patient:archive')).toBe(true)
  })

  it('gives a doctor a narrower set than a clinic account', async () => {
    setAccessToken(accessTokenFor('doctor'))
    const session = await fetchSession()

    expect(session.role).toBe('doctor')
    expect(session.permissions.has('medical-record:write')).toBe(true)
    expect(session.permissions.has('billing:write')).toBe(false)
    expect(session.permissions.has('patient:archive')).toBe(false)
  })

  it('survives a serializer that stopped sending an optional field', async () => {
    server.use(
      http.get('/api/v1/authentication/me/', () =>
        // Only the two fields the interface actually needs.
        HttpResponse.json({ full_name: 'Dilnoza Rahimova', role: 'superadmin' }),
      ),
    )

    const session = await fetchSession()

    expect(session.fullName).toBe('Dilnoza Rahimova')
    expect(session.phoneNumber).toBeNull()
    expect(session.email).toBeNull()
  })

  it('fails loudly when the contract is broken', async () => {
    server.use(
      http.get('/api/v1/authentication/me/', () => {
        // `role` dropped by a serializer change. Rendering an application with
        // every control hidden would look like "this user may do nothing" — an
        // error is the honest outcome.
        const { role: _role, ...withoutRole } = ME_RESPONSE
        return HttpResponse.json(withoutRole)
      }),
    )

    await expect(fetchSession()).rejects.toThrow()
  })

  it('rejects a role the permission table does not cover', async () => {
    server.use(
      http.get('/api/v1/authentication/me/', () =>
        HttpResponse.json({ ...ME_RESPONSE, role: 'nurse' }),
      ),
    )

    await expect(fetchSession()).rejects.toThrow()
  })
})

describe('when there is no usable token', () => {
  it('reports unauthorized without asking the server', async () => {
    let calls = 0
    server.use(
      http.get('/api/v1/authentication/me/', () => {
        calls += 1
        return HttpResponse.json(ME_RESPONSE)
      }),
    )

    // The state every page reload starts in: the token lived in memory only.
    await expect(fetchSession()).rejects.toBeInstanceOf(ApiError)
    expect(calls).toBe(0)
  })
})

describe('when the server rejects the token', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('reports unauthorized and hands off exactly once', async () => {
    const onUnauthorized = vi.fn()
    configureApi({ onUnauthorized })
    server.use(
      http.get('/api/v1/authentication/me/', () =>
        HttpResponse.json(
          {
            message: 'Given token not valid for any token type',
            message_key: 'unauthorized',
            errors: {},
            exception_class: 'InvalidToken',
          },
          { status: 401 },
        ),
      ),
    )

    await expect(fetchSession()).rejects.toBeInstanceOf(ApiError)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('does not retry a 401', async () => {
    let calls = 0
    server.use(
      http.get('/api/v1/authentication/me/', () => {
        calls += 1
        return HttpResponse.json({ message_key: 'unauthorized' }, { status: 401 })
      }),
    )
    configureApi({ onUnauthorized: () => {} })

    await expect(fetchSession()).rejects.toBeInstanceOf(ApiError)
    // There is no refresh route to retry against, so a retry only delays /login.
    expect(calls).toBe(1)
  })
})

describe('the bearer header', () => {
  it('carries the token on every request', async () => {
    const seen: (string | null)[] = []
    server.use(
      http.get('/api/v1/authentication/me/', ({ request }) => {
        seen.push(request.headers.get('Authorization'))
        return HttpResponse.json(ME_RESPONSE)
      }),
    )
    setAccessToken(accessTokenFor('clinic'))

    await fetchSession()

    expect(seen).toHaveLength(1)
    expect(seen[0]).toBe(`Bearer ${accessTokenFor('clinic')}`)
  })
})
