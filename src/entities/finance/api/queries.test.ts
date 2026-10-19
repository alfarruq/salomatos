import { describe, expect, it } from 'vitest'
import { rangeOf } from '@/shared/lib/report'
import { fetchFinanceOverview, financeKeys } from './queries'

const sum = (values: readonly number[]) => values.reduce((acc, value) => acc + value, 0)

describe('financeKeys', () => {
  it('puts the clinic inside every key', () => {
    const range = rangeOf('week', '2026-10-19')
    expect(financeKeys.overview(1, range)).toEqual(['clinics', 1, 'finance', 'overview', range])
    expect(financeKeys.overview(1, range)).not.toEqual(financeKeys.overview(2, range))
  })
})

describe('fetchFinanceOverview (mock)', () => {
  it('passes the wire schema and adds up to the totals', async () => {
    const overview = await fetchFinanceOverview(rangeOf('month', '2026-10-19'))

    expect(overview.series).toHaveLength(30)
    expect(sum(overview.series.map((point) => point.billed))).toBe(overview.totals.billed)
    expect(sum(overview.series.map((point) => point.collected))).toBe(overview.totals.collected)
    expect(sum(overview.paymentMethods.map((row) => row.amount))).toBe(overview.totals.collected)
    expect(sum(overview.doctors.map((row) => row.collected))).toBe(overview.totals.collected)
    expect(sum(overview.treatmentTypes.map((row) => row.billed))).toBe(overview.totals.billed)
  })

  it('sorts debtors by debt, largest first', async () => {
    const { topDebtors } = await fetchFinanceOverview(rangeOf('week', '2026-10-19'))
    const debts = topDebtors.map((row) => row.debt)

    expect(debts).toEqual([...debts].sort((a, b) => b - a))
  })
})
