import { describe, expect, it } from 'vitest'
import { isSameCalendarDay, parseCalendarDate, toCalendarDate } from './calendarDate'

describe('calendarDate', () => {
  it('round-trips a date without shifting the day', () => {
    const parsed = parseCalendarDate('2026-08-21')

    expect(parsed).not.toBeNull()
    expect(toCalendarDate(parsed as Date)).toBe('2026-08-21')
  })

  it('reads the local calendar day, not a UTC instant', () => {
    // `new Date('2026-01-01')` is UTC midnight and renders as 31 December in
    // any negative offset. §12.4 calls that class of bug a serious incident.
    const parsed = parseCalendarDate('2026-01-01') as Date

    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(0)
    expect(parsed.getDate()).toBe(1)
  })

  it('rejects a day that does not exist', () => {
    // JavaScript would roll this into 3 March rather than complaining.
    expect(parseCalendarDate('2026-02-31')).toBeNull()
  })

  it('accepts a real leap day and rejects a fake one', () => {
    expect(parseCalendarDate('2028-02-29')).not.toBeNull()
    expect(parseCalendarDate('2026-02-29')).toBeNull()
  })

  it('rejects malformed input', () => {
    for (const input of ['21-08-2026', '2026/08/21', '2026-8-21', '', 'yesterday']) {
      expect(parseCalendarDate(input)).toBeNull()
    }
  })

  it('compares days regardless of time of day', () => {
    expect(isSameCalendarDay(new Date(2026, 7, 21, 9), new Date(2026, 7, 21, 23))).toBe(true)
    expect(isSameCalendarDay(new Date(2026, 7, 21), new Date(2026, 7, 22))).toBe(false)
  })
})
