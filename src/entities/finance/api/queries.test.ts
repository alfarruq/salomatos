import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { rangeOf } from '@/shared/lib/report'
import { fetchFinanceOverview, financeKeys } from './queries'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

const totals = { billed: 0, collected: 0, new_debt: 0, outstanding_debt: 0, debtors_count: 0 }

describe('financeKeys', () => {
  it('puts the clinic inside every key', () => {
    const range = rangeOf('week', '2026-10-19')
    expect(financeKeys.overview(1, range)).toEqual(['clinics', 1, 'finance', 'overview', range])
    expect(financeKeys.overview(1, range)).not.toEqual(financeKeys.overview(2, range))
  })
})

describe('fetchFinanceOverview', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('asks for the range and maps the wire shape', async () => {
    const range = rangeOf('week', '2026-10-19')
    let query = ''
    server.use(
      http.get('/api/v1/finance/overview/', ({ request }) => {
        query = new URL(request.url).search
        return HttpResponse.json({
          from: range.from,
          to: range.to,
          bucket: 'day',
          totals: { ...totals, billed: 500_000, collected: 300_000 },
          previous_totals: null,
          series: [{ start: range.from, billed: 500_000, collected: 300_000 }],
          doctors: [{ doctor_id: 3, doctor: 'Karimov', collected: 300_000 }],
          treatment_types: [{ treatment_type_id: 7, treatment_type: 'Plomba', billed: 500_000 }],
          top_debtors: [
            { patient_id: 9, patient: 'A', debt: 200_000, last_payment_date: null, doctor: null },
          ],
        })
      }),
    )

    const overview = await fetchFinanceOverview(range)

    expect(query).toBe(`?from=${range.from}&to=${range.to}`)
    expect(overview.totals.collected).toBe(300_000)
    expect(overview.doctors).toEqual([{ doctorId: 3, doctorName: 'Karimov', collected: 300_000 }])
    expect(overview.topDebtors[0]?.patientId).toBe(9)
  })
})
