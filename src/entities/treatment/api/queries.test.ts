import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { fetchTreatments, treatmentKeys } from './queries'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

describe('treatmentKeys', () => {
  it('puts the clinic inside every key', () => {
    // §6.2 — the id is never sent to the server, only used to scope the cache.
    expect(treatmentKeys.list(1, 101)).toEqual(['clinics', 1, 'treatments', 'list', 101])
    expect(treatmentKeys.list(1, 101)).not.toEqual(treatmentKeys.list(2, 101))
  })
})

describe('fetchTreatments', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('reads the array the fixture has for the requested patient', async () => {
    const treatments = await fetchTreatments(101)

    expect(treatments).toHaveLength(2)
    expect(treatments[0]).toEqual({
      id: 1,
      doctorName: 'Sardor Usmonov',
      treatmentTypeName: 'Implantatsiya',
      totalTreatmentCost: 4_000_000,
      totalPaid: 2_800_000,
      remaining: 1_200_000,
      visitNumber: 3,
      toothNumber: 36,
      startDate: '2026-08-20',
      notes: 'Implant o‘rnatildi, keyingi tashrif nazorat uchun.',
      status: 'in_progress',
    })
  })

  it('sends the patient filter, not a page number', async () => {
    let requested: string | undefined
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/api/v1/clinic/treatments/')) requested = request.url
    })

    await fetchTreatments(101)

    expect(requested).toContain('patient_id=101')
  })

  it('is empty for a patient with no treatments on record', async () => {
    expect(await fetchTreatments(103)).toEqual([])
  })

  it('takes `remaining` whichever way the server types it', async () => {
    // `TreatmentList.remaining` is documented `readOnly string`; the fixture's
    // second row sends it that way and the first sends every count as a number.
    const treatments = await fetchTreatments(101)

    expect(treatments[1]?.remaining).toBe(0)
  })

  it('survives a row missing everything but its id', async () => {
    server.use(http.get('/api/v1/clinic/treatments/', () => HttpResponse.json([{ id: 9 }])))

    const treatments = await fetchTreatments(101)

    expect(treatments).toEqual([
      {
        id: 9,
        doctorName: null,
        treatmentTypeName: null,
        totalTreatmentCost: null,
        totalPaid: null,
        remaining: null,
        visitNumber: null,
        toothNumber: null,
        startDate: null,
        notes: null,
        status: null,
      },
    ])
  })

  it('refuses an impossible calendar date rather than passing it through', async () => {
    server.use(
      http.get('/api/v1/clinic/treatments/', () =>
        HttpResponse.json([{ id: 1, start_date: '2026-02-31' }]),
      ),
    )

    expect((await fetchTreatments(101))[0]?.startDate).toBeNull()
  })

  it('refuses to serve treatments without a token', async () => {
    clearAccessToken()

    await expect(fetchTreatments(101)).rejects.toBeInstanceOf(ApiError)
  })
})
