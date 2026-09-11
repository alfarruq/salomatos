import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { doctorTypeKeys, fetchDoctorTypes } from './queries'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

describe('doctorTypeKeys', () => {
  it('puts the clinic inside every key', () => {
    // §6.2 — without it, a second account on the same machine would be served
    // the first one's doctor categories out of memory.
    expect(doctorTypeKeys.list(1)).toEqual(['clinics', 1, 'doctor-types', 'list'])
    expect(doctorTypeKeys.list(1)).not.toEqual(doctorTypeKeys.list(2))
  })
})

describe('fetchDoctorTypes', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('reads a plain array, because this endpoint does not paginate', async () => {
    /*
     * The published schema shows a single object here — `swagger_auto_schema`
     * was given the serializer without `many=True`. The Python returns a list.
     */
    const types = await fetchDoctorTypes()

    expect(types).toHaveLength(2)
    expect(types[0]).toEqual({ id: 5, name: 'Stomatolog' })
  })

  it('refuses a row with no name, which nothing could render', async () => {
    server.use(http.get('/api/v1/clinic/doctors/types/', () => HttpResponse.json([{ id: 9 }])))

    await expect(fetchDoctorTypes()).rejects.toThrow()
  })

  it('needs a token', async () => {
    clearAccessToken()

    await expect(fetchDoctorTypes()).rejects.toBeInstanceOf(ApiError)
  })
})
