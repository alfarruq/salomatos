import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { doctorKeys, fetchDoctors } from './queries'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

describe('doctorKeys', () => {
  it('puts the clinic inside every key', () => {
    // §6.2 — without it, a second account on the same machine would be served
    // the first one's staff list out of memory.
    expect(doctorKeys.list(1)).toEqual(['clinics', 1, 'doctors', 'list'])
    expect(doctorKeys.list(1)).not.toEqual(doctorKeys.list(2))
  })
})

describe('fetchDoctors', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('reads a plain array, because this endpoint does not paginate', async () => {
    /*
     * The published schema shows a single object here — `swagger_auto_schema`
     * was given the serializer without `many=True`. The Python returns a list.
     * Patients paginate; doctors do not.
     */
    const doctors = await fetchDoctors()

    expect(doctors).toHaveLength(2)
    expect(doctors[0]?.fullName).toBe('Sardor Usmonov')
  })

  it('carries a doctor with nothing but a name', async () => {
    const doctors = await fetchDoctors()

    expect(doctors[1]?.fullName).toBe('Malika Yusupova')
    expect(doctors[1]?.phoneNumber).toBeNull()
  })

  it('survives a serializer that stopped sending an optional field', async () => {
    server.use(
      http.get('/api/v1/clinic/doctors/', () =>
        HttpResponse.json([{ id: 9, full_name: 'Nodir Qodirov' }]),
      ),
    )

    const doctors = await fetchDoctors()

    expect(doctors[0]?.fullName).toBe('Nodir Qodirov')
    expect(doctors[0]?.email).toBeNull()
  })

  it('refuses a row with no name, which nothing could render', async () => {
    server.use(http.get('/api/v1/clinic/doctors/', () => HttpResponse.json([{ id: 9 }])))

    await expect(fetchDoctors()).rejects.toThrow()
  })

  it('needs a token', async () => {
    clearAccessToken()

    await expect(fetchDoctors()).rejects.toBeInstanceOf(ApiError)
  })
})
