import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { toTreatmentTypePayload } from '../model/formSchema'
import { fetchTreatmentTypes, treatmentTypeKeys } from './queries'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

describe('treatmentTypeKeys', () => {
  it('puts the clinic inside every key', () => {
    expect(treatmentTypeKeys.list(1)).toEqual(['clinics', 1, 'treatment-types', 'list'])
    expect(treatmentTypeKeys.list(1)).not.toEqual(treatmentTypeKeys.list(2))
  })
})

describe('fetchTreatmentTypes', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('reads a plain array, because this endpoint does not paginate', async () => {
    const services = await fetchTreatmentTypes()

    expect(services).toHaveLength(3)
    expect(services[0]).toEqual({ id: 7, name: 'Implantatsiya', price: 4_000_000 })
  })

  it('keeps "no price" distinct from free', async () => {
    const services = await fetchTreatmentTypes()

    // Quoted per case. Rendering it as 0 so'm would be a quote nobody gave.
    expect(services[2]?.price).toBeNull()
  })

  it('takes a price whichever way the server types it', async () => {
    server.use(
      http.get('/api/v1/clinic/treatment-types/', () =>
        HttpResponse.json([{ id: 1, name: 'Tozalash', price: '250000' }]),
      ),
    )

    expect((await fetchTreatmentTypes())[0]?.price).toBe(250_000)
  })

  it('refuses a row with no name, which nothing could render', async () => {
    server.use(
      http.get('/api/v1/clinic/treatment-types/', () => HttpResponse.json([{ id: 1, price: 10 }])),
    )

    await expect(fetchTreatmentTypes()).rejects.toThrow()
  })
})

describe('toTreatmentTypePayload', () => {
  it('sends null for an unset price, not zero', () => {
    // The clinic has not decided a price; it has not decided the work is free.
    expect(toTreatmentTypePayload({ name: 'Konsultatsiya', price: '' })).toEqual({
      name: 'Konsultatsiya',
      price: null,
    })
  })

  it('sends a number, not the string the input held', () => {
    expect(toTreatmentTypePayload({ name: 'Tozalash', price: '250000' })).toEqual({
      name: 'Tozalash',
      price: 250_000,
    })
  })
})
