import { beforeEach, describe, expect, it } from 'vitest'
import { clinicNow } from '@/shared/lib/datetime'
import { rangeOf } from '@/shared/lib/report'
import { mockExpenseServer, resetMockExpenses } from './mockServer'
import {
  expenseKeys,
  fetchDueMonth,
  fetchExpenseSummary,
  fetchExpenses,
  fetchRecurringExpenses,
} from './queries'

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

describe('recurring expenses (mock)', () => {
  // Next month: nothing in it is paid or overdue yet, whatever today is.
  const [year = 0, month = 1] = clinicNow().date.split('-').map(Number)
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`

  it('lists a future month as all due, with nothing posted for it', async () => {
    const due = await fetchDueMonth(next)

    expect(due.items.length).toBe((await fetchRecurringExpenses()).length)
    expect(due.items.every((item) => item.status === 'due' && item.expenseId === null)).toBe(true)
    expect(due.totals.paid).toBe(0)
    expect(due.totals.remaining).toBe(due.totals.expected)
  })

  it('posts a payment as an expense, and frees the month again once that is voided', async () => {
    const [item] = (await fetchDueMonth(next)).items
    if (item === undefined) throw new Error('seed has no templates')
    const range = rangeOf('week', clinicNow().date)
    const before = (await fetchExpenseSummary(range)).totals.total

    const expense = await mockExpenseServer.pay(item.recurringId, {
      month: next,
      date: clinicNow().date,
      amount: 777_000,
      method: 'cash',
      note: null,
    })
    expect(expense.recurring_id).toBe(item.recurringId)
    expect((await fetchExpenseSummary(range)).totals.total).toBe(before + 777_000)

    const paid = (await fetchDueMonth(next)).items.find(
      (row) => row.recurringId === item.recurringId,
    )
    expect(paid).toMatchObject({ status: 'paid', paidAmount: 777_000, expenseId: expense.id })
    // A month is paid once.
    await expect(
      mockExpenseServer.pay(item.recurringId, {
        month: next,
        date: clinicNow().date,
        amount: 1,
        method: 'cash',
        note: null,
      }),
    ).rejects.toThrow()

    await mockExpenseServer.void(expense.id, 'Xato')
    const freed = (await fetchDueMonth(next)).items.find(
      (row) => row.recurringId === item.recurringId,
    )
    expect(freed?.status).toBe('due')
  })

  it('leaves a skipped month out of what is expected', async () => {
    const before = await fetchDueMonth(next)
    const [item] = before.items
    if (item === undefined) throw new Error('seed has no templates')

    await mockExpenseServer.skip(item.recurringId, next)
    const after = await fetchDueMonth(next)

    expect(after.items.find((row) => row.recurringId === item.recurringId)?.status).toBe('skipped')
    expect(after.totals.expected).toBe(before.totals.expected - item.amount)
  })

  it('drops a paused template from the months it was not paid in', async () => {
    const [item] = (await fetchDueMonth(next)).items
    if (item === undefined) throw new Error('seed has no templates')

    await mockExpenseServer.updateRecurring(item.recurringId, { is_active: false })
    const after = await fetchDueMonth(next)

    expect(after.items.some((row) => row.recurringId === item.recurringId)).toBe(false)
  })
})
