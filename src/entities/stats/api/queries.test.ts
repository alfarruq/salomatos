import { describe, expect, it } from 'vitest'
import { rangeOf } from '@/shared/lib/report'
import { fetchStatsOverview, statsKeys } from './queries'

describe('statsKeys', () => {
  it('puts the clinic inside every key', () => {
    const range = rangeOf('week', '2026-10-19')
    expect(statsKeys.overview(1, range)).toEqual(['clinics', 1, 'stats', 'overview', range])
    expect(statsKeys.overview(1, range)).not.toEqual(statsKeys.overview(2, range))
  })
})

describe('fetchStatsOverview (mock)', () => {
  it('passes the wire schema and adds up', async () => {
    const overview = await fetchStatsOverview(rangeOf('month', '2026-10-19'))

    expect(overview.appointmentsSeries).toHaveLength(30)
    const seriesTotal = overview.appointmentsSeries.reduce((acc, point) => acc + point.total, 0)
    expect(overview.totals.appointments).toBe(seriesTotal)
    expect(overview.doctors.reduce((acc, row) => acc + row.appointments, 0)).toBe(seriesTotal)
    expect(overview.busySlots.reduce((acc, slot) => acc + slot.appointments, 0)).toBe(seriesTotal)

    const treated = overview.totals.treatmentsCompleted
    expect(overview.treatmentsSeries.reduce((acc, point) => acc + point.completed, 0)).toBe(treated)
    expect(overview.doctors.reduce((acc, row) => acc + row.treatmentsCompleted, 0)).toBe(treated)
    expect(overview.teeth).toHaveLength(32)
    expect(overview.teeth.reduce((acc, row) => acc + row.count, 0)).toBe(treated)
  })

  it('buckets a year by month', async () => {
    const overview = await fetchStatsOverview(rangeOf('year', '2026-10-19'))

    expect(overview.appointmentsSeries.map((point) => point.start).slice(0, 2)).toEqual([
      '2025-10-20',
      '2025-11-01',
    ])
    expect(overview.appointmentsSeries).toHaveLength(13)
  })

  it('is stable for the same range', async () => {
    const range = rangeOf('week', '2026-10-19')
    expect(await fetchStatsOverview(range)).toEqual(await fetchStatsOverview(range))
  })
})
