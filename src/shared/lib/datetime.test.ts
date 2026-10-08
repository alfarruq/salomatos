import { describe, expect, it } from 'vitest'
import { CLINIC_TZ, clinicDayOf, formatDate, formatDateTime, formatTime } from './datetime'

/**
 * These tests exist because §12.4 calls a one-hour slip a serious incident. The
 * assertions are about the clinic's clock, not the machine running the tests —
 * which is the whole point.
 */
describe('formatDateTime', () => {
  it('renders an instant in the clinic zone, not the browser`s', () => {
    // 09:00 UTC is 14:00 in Tashkent (UTC+5).
    expect(formatDateTime('2026-08-21T09:00:00Z', { locale: 'en-GB' })).toContain('14:00')
  })

  it('formats per locale rather than by hand', () => {
    const instant = '2026-08-21T09:00:00Z'

    // Different languages order and punctuate dates differently; Intl knows.
    expect(formatDate(instant, { locale: 'en-GB' })).not.toBe(formatDate(instant, { locale: 'ru' }))
  })

  it('shows the time alone when the date is a heading elsewhere', () => {
    expect(formatTime('2026-08-21T09:00:00Z', { locale: 'en-GB' })).toBe('14:00')
  })

  it('refuses a value the backend should never have sent', () => {
    // Better a loud failure than "Invalid Date" printed into a patient record.
    expect(() => formatDateTime('not-a-date', { locale: 'en-GB' })).toThrow()
  })
})

describe('clinicDayOf', () => {
  it('uses the clinic day, not the UTC day', () => {
    /*
     * 21:00 UTC is 02:00 the next morning in Tashkent. `toISOString().slice(0, 10)`
     * would call this the 21st and file a night appointment under the wrong day.
     */
    expect(clinicDayOf('2026-08-21T21:00:00Z')).toBe('2026-08-22')
  })

  it('agrees with UTC in the middle of the clinic`s day', () => {
    expect(clinicDayOf('2026-08-21T09:00:00Z')).toBe('2026-08-21')
  })

  it('handles the other edge, just before midnight local', () => {
    // 18:30 UTC is 23:30 in Tashkent — still the same day.
    expect(clinicDayOf('2026-08-21T18:30:00Z')).toBe('2026-08-21')
  })
})

describe('CLINIC_TZ', () => {
  it('is the zone ADR-010 fixed', () => {
    expect(CLINIC_TZ).toBe('Asia/Tashkent')
  })
})
