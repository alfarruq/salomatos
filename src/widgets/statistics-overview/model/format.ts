import { addDays, type StatsBucket } from '@/entities/stats'
import { parseCalendarDate } from '@/shared/lib/calendarDate'

/** Signed percentage change, or null when there is nothing to compare with. */
export function percentChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/** Share as a whole percentage; 0 for an empty denominator rather than NaN. */
export function percentOf(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

/**
 * Axis label for a bucket's first day. A calendar date has no zone of its own,
 * so it is formatted as the local date it parses to — no `timeZone` here.
 */
export function bucketLabel(start: string, bucket: StatsBucket, locale: string): string {
  const date = parseCalendarDate(start)
  if (date === null) return start
  const options: Intl.DateTimeFormatOptions =
    bucket === 'month' ? { month: 'short' } : { day: 'numeric', month: 'short' }
  return new Intl.DateTimeFormat(locale, options).format(date)
}

/** A known Monday, so ISO weekday n is that date plus n − 1 days. */
const REFERENCE_MONDAY = '2024-01-01'

export function weekdayLabel(isoWeekday: number, locale: string): string {
  const date = parseCalendarDate(addDays(REFERENCE_MONDAY, isoWeekday - 1))
  return date === null
    ? String(isoWeekday)
    : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)
}
