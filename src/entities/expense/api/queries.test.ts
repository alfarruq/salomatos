import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { rangeOf } from '@/shared/lib/report'
import { expenseKeys, fetchDueMonth, fetchExpenses, fetchPayroll } from './queries'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

const expense = {
  id: 5,
  date: '2026-10-19',
  category: 'rent',
  amount: 1_230_000,
  payee: 'Landlord',
  note: null,
  doctor_id: null,
  doctor: null,
  is_void: false,
  void_reason: null,
  created_by: 'Owner',
  recurring_id: 2,
}

describe('expenseKeys', () => {
  it('puts the clinic inside every key', () => {
    const range = rangeOf('week', '2026-10-19')
    const filters = { from: range.from, to: range.to, category: null, page: 1 }

    expect(expenseKeys.summary(1, range)).toEqual(['clinics', 1, 'expenses', 'summary', range])
    expect(expenseKeys.list(1, filters)).not.toEqual(expenseKeys.list(2, filters))
    expect(expenseKeys.list(1, filters).slice(0, 3)).toEqual(expenseKeys.scope(1))
  })
})

describe('expense fetches', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('sends the filters and maps one page', async () => {
    let query = ''
    server.use(
      http.get('/api/v1/finance/expenses/', ({ request }) => {
        query = new URL(request.url).search
        return HttpResponse.json({ count: 11, next: '/next', previous: null, results: [expense] })
      }),
    )

    const page = await fetchExpenses({
      from: '2026-10-01',
      to: '2026-10-31',
      category: 'rent',
      page: 1,
    })

    expect(query).toBe('?from=2026-10-01&to=2026-10-31&page=1&category=rent')
    expect(page.hasNext).toBe(true)
    expect(page.results[0]).toMatchObject({ id: 5, payee: 'Landlord', recurringId: 2 })
  })

  it('reads one month of recurring bills', async () => {
    server.use(
      http.get('/api/v1/finance/recurring-expenses/due/', ({ request }) => {
        expect(new URL(request.url).searchParams.get('month')).toBe('2026-10')
        return HttpResponse.json({
          month: '2026-10',
          totals: { expected: 100, paid: 0, remaining: 100 },
          items: [
            {
              recurring_id: 2,
              name: 'Rent',
              category: 'rent',
              amount: 100,
              payee: null,
              due_date: '2026-10-05',
              status: 'overdue',
              expense_id: null,
              paid_amount: null,
              paid_date: null,
            },
          ],
        })
      }),
    )

    const due = await fetchDueMonth('2026-10')

    expect(due.items[0]).toMatchObject({ recurringId: 2, status: 'overdue' })
  })

  it('keeps a negative balance when a doctor was paid ahead', async () => {
    server.use(
      http.get('/api/v1/finance/payroll/', () =>
        HttpResponse.json({
          month: '2026-10',
          rows: [
            {
              doctor_id: 3,
              doctor: 'Karimov',
              compensation: null,
              collected: 0,
              billed: 0,
              lab: 0,
              base_amount: 0,
              accrued: 0,
              opening: -50_000,
              paid: 0,
              balance: -50_000,
            },
          ],
          totals: { accrued: 0, paid: 0, balance: -50_000 },
        }),
      ),
    )

    const payroll = await fetchPayroll('2026-10')

    expect(payroll.rows[0]?.balance).toBe(-50_000)
  })
})
