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

/** A one-page envelope — the shape every test but the pagination one needs. */
function onePage(results: unknown[]) {
  return { count: results.length, next: null, previous: null, results }
}

describe('treatmentTypeKeys', () => {
  it('puts the clinic inside every key', () => {
    expect(treatmentTypeKeys.list(1)).toEqual(['clinics', 1, 'treatment-types', 'list'])
    expect(treatmentTypeKeys.list(1)).not.toEqual(treatmentTypeKeys.list(2))
  })
})

describe('fetchTreatmentTypes', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('reads the one page the fixture has', async () => {
    const services = await fetchTreatmentTypes()

    expect(services).toHaveLength(3)
    expect(services[0]).toEqual({
      id: 7,
      name: 'Implantatsiya',
      price: 4_000_000,
      doctorTypeName: 'Stomatolog',
    })
  })

  it('follows `next` until it is null, rather than stopping at page one', async () => {
    // A clinic with more services than fit on one page — this is exactly the
    // shape that a plain-array assumption silently truncated in production.
    server.use(
      http.get('/api/v1/clinic/treatment-types/', ({ request }) => {
        const page = new URL(request.url).searchParams.get('page')
        if (page === '2') {
          return HttpResponse.json({
            count: 3,
            next: null,
            previous: '/api/v1/clinic/treatment-types/',
            results: [{ id: 2, name: 'Tozalash', price: 250_000, doctor_type: null }],
          })
        }
        return HttpResponse.json({
          count: 3,
          next: '/api/v1/clinic/treatment-types/?page=2',
          previous: null,
          results: [{ id: 1, name: 'Implantatsiya', price: 4_000_000, doctor_type: 'Stomatolog' }],
        })
      }),
    )

    const services = await fetchTreatmentTypes()

    expect(services.map((service) => service.id)).toEqual([1, 2])
  })

  it('reads the assigned doctor type as a name, like the doctors endpoint', async () => {
    const services = await fetchTreatmentTypes()

    expect(services[1]?.doctorTypeName).toBe('Ortodont')
  })

  it('trusts DRF to emit null for an unassigned doctor type', async () => {
    const services = await fetchTreatmentTypes()

    expect(services[2]?.doctorTypeName).toBeNull()
  })

  it('survives a serializer that stopped sending an optional field', async () => {
    server.use(
      http.get('/api/v1/clinic/treatment-types/', () =>
        HttpResponse.json(onePage([{ id: 1, name: 'Konsultatsiya' }])),
      ),
    )

    const services = await fetchTreatmentTypes()

    expect(services[0]?.doctorTypeName).toBeNull()
  })

  it('keeps "no price" distinct from free', async () => {
    const services = await fetchTreatmentTypes()

    // Quoted per case. Rendering it as 0 so'm would be a quote nobody gave.
    expect(services[2]?.price).toBeNull()
  })

  it('takes a price whichever way the server types it', async () => {
    server.use(
      http.get('/api/v1/clinic/treatment-types/', () =>
        HttpResponse.json(onePage([{ id: 1, name: 'Tozalash', price: '250000' }])),
      ),
    )

    expect((await fetchTreatmentTypes())[0]?.price).toBe(250_000)
  })

  it('refuses a row with no name, which nothing could render', async () => {
    server.use(
      http.get('/api/v1/clinic/treatment-types/', () =>
        HttpResponse.json(onePage([{ id: 1, price: 10 }])),
      ),
    )

    await expect(fetchTreatmentTypes()).rejects.toThrow()
  })
})

describe('toTreatmentTypePayload', () => {
  it('sends null for an unset price, not zero', () => {
    // The clinic has not decided a price; it has not decided the work is free.
    expect(toTreatmentTypePayload({ name: 'Konsultatsiya', price: '', doctorTypeId: '' })).toEqual({
      name: 'Konsultatsiya',
      price: null,
      doctor_type: null,
    })
  })

  it('sends a number, not the string the input held', () => {
    expect(
      toTreatmentTypePayload({ name: 'Tozalash', price: '250000', doctorTypeId: '5' }),
    ).toEqual({
      name: 'Tozalash',
      price: 250_000,
      doctor_type: 5,
    })
  })
})
