import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { clinicKeys, fetchClinic } from './queries'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

describe('clinicKeys', () => {
  it('puts the clinic inside every key', () => {
    expect(clinicKeys.mine(1)).toEqual(['clinics', 1, 'profile', 'mine'])
    expect(clinicKeys.mine(1)).not.toEqual(clinicKeys.mine(2))
  })
})

describe('fetchClinic', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('reports no clinic as null, not an empty array', async () => {
    // The mock defaults to an empty list — the state a fresh account starts in.
    expect(await fetchClinic()).toBeNull()
  })

  it('takes the first row when the account has one', async () => {
    server.use(
      http.get('/api/v1/clinic/', () =>
        HttpResponse.json([
          {
            name: 'Salomat Dental',
            phone_number: '+998901112233',
            address: 'Chilonzor 12',
            logo: null,
            working_hours: {},
          },
        ]),
      ),
    )

    const clinic = await fetchClinic()

    expect(clinic?.name).toBe('Salomat Dental')
  })

  it('needs a token', async () => {
    clearAccessToken()

    await expect(fetchClinic()).rejects.toBeInstanceOf(ApiError)
  })
})
