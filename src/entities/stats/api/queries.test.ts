import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { rangeOf } from '@/shared/lib/report'
import { fetchStatsOverview, statsKeys } from './queries'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

const totals = {
  appointments: 4,
  appointments_completed: 3,
  new_patients: 1,
  returning_patients: 2,
  treatments_completed: 2,
  treatments_started: 1,
  treatments_in_progress: 5,
}

describe('statsKeys', () => {
  it('puts the clinic inside every key', () => {
    const range = rangeOf('week', '2026-10-19')
    expect(statsKeys.overview(1, range)).toEqual(['clinics', 1, 'stats', 'overview', range])
    expect(statsKeys.overview(1, range)).not.toEqual(statsKeys.overview(2, range))
  })
})

describe('fetchStatsOverview', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('asks for the range and maps the wire shape', async () => {
    const range = rangeOf('week', '2026-10-19')
    let query = ''
    server.use(
      http.get('/api/v1/statistics/overview/', ({ request }) => {
        query = new URL(request.url).search
        return HttpResponse.json({
          from: range.from,
          to: range.to,
          bucket: 'day',
          totals,
          previous_totals: null,
          appointments_series: [{ start: range.from, total: 4, completed: 3 }],
          treatments_series: [{ start: range.from, completed: 2 }],
          doctors: [{ doctor_id: 3, doctor: 'Karimov', appointments: 4, treatments_completed: 2 }],
          treatment_types: [{ treatment_type_id: 7, treatment_type: 'Plomba', count: 2 }],
          busy_hours: [{ weekday: 1, hour: 10, appointments: 4 }],
          teeth: [{ tooth: '36', count: 2 }],
        })
      }),
    )

    const overview = await fetchStatsOverview(range)

    expect(query).toBe(`?from=${range.from}&to=${range.to}`)
    expect(overview.totals.treatmentsInProgress).toBe(5)
    expect(overview.doctors[0]).toEqual({
      doctorId: 3,
      doctorName: 'Karimov',
      appointments: 4,
      treatmentsCompleted: 2,
    })
    expect(overview.busySlots).toEqual([{ weekday: 1, hour: 10, appointments: 4 }])
  })
})
