import { beforeEach, describe, expect, it } from 'vitest'
import { clinicNow } from '@/shared/lib/datetime'
import { rangeOf } from '@/shared/lib/report'
import { mockExpenseServer, resetMockExpenses } from './mockServer'
import { expenseKeys, fetchExpenseSummary, fetchExpenses } from './queries'

const sum = (values: readonly number[]) => values.reduce((acc, value) => acc + value, 0)

const payload = {
  date: clinicNow().date,
  category: 'rent',
  amount: 1_230_000,
  method: 'transfer',
  payee: 'Test',
  note: null,
  doctor: null,
} as const

beforeEach(() => resetMockExpenses())

describe('expenseKeys', () => {
  it('puts the clinic inside every key', () => {
    const range = rangeOf('week', '2026-10-19')
    const filters = { from: range.from, to: range.to, category: null, page: 1 }

    expect(expenseKeys.summary(1, range)).toEqual(['clinics', 1, 'expenses', 'summary', range])
    expect(expenseKeys.list(1, filters)).not.toEqual(expenseKeys.list(2, filters))
    expect(expenseKeys.list(1, filters).slice(0, 3)).toEqual(expenseKeys.scope(1))
  })
})

describe('expenses (mock)', () => {
  it('passes the wire schema and adds up to the totals', async () => {
    const summary = await fetchExpenseSummary(rangeOf('month', clinicNow().date))
    const { totals } = summary

    expect(summary.series).toHaveLength(30)
    expect(sum(summary.series.map((point) => point.amount))).toBe(totals.total)
    expect(sum(summary.byCategory.map((row) => row.amount))).toBe(totals.total)
    expect(totals.payroll + totals.fixed + totals.variable).toBe(totals.total)
    expect(summary.previousTotals).not.toBeNull()
  })

  it('lists newest first, one server page at a time', async () => {
    const range = rangeOf('quarter', clinicNow().date)
    const page = await fetchExpenses({ from: range.from, to: range.to, category: null, page: 1 })
    const dates = page.results.map((row) => row.date)

    expect(page.results).toHaveLength(10)
    expect(page.hasPrevious).toBe(false)
    expect(page.hasNext).toBe(true)
    expect(dates).toEqual([...dates].sort().reverse())
  })

  it('filters by category', async () => {
    const range = rangeOf('quarter', clinicNow().date)
    const page = await fetchExpenses({ from: range.from, to: range.to, category: 'rent', page: 1 })

    expect(page.results.length).toBeGreaterThan(0)
    expect(page.results.every((row) => row.category === 'rent')).toBe(true)
  })

  it('counts a new entry and stops counting it once voided', async () => {
    const range = rangeOf('week', clinicNow().date)
    const before = (await fetchExpenseSummary(range)).totals.total

    const created = await mockExpenseServer.create(payload, null)
    expect((await fetchExpenseSummary(range)).totals.total).toBe(before + payload.amount)

    const voided = await mockExpenseServer.void(created.id, 'Ikki marta kiritilgan')
    expect(voided.is_void).toBe(true)
    expect((await fetchExpenseSummary(range)).totals.total).toBe(before)

    // Final: a voided entry can be neither edited nor voided again.
    await expect(mockExpenseServer.update(created.id, payload, null)).rejects.toThrow()
  })
})
