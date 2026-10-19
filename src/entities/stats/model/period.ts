import { type CalendarDate, parseCalendarDate, toCalendarDate } from '@/shared/lib/calendarDate'
import type { StatsBucket, StatsPeriod, StatsRange } from './types'

const PERIOD_SHAPE: Record<StatsPeriod, { days: number; bucket: StatsBucket }> = {
  week: { days: 7, bucket: 'day' },
  month: { days: 30, bucket: 'day' },
  quarter: { days: 91, bucket: 'week' },
  year: { days: 365, bucket: 'month' },
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const parsed = parseCalendarDate(date)
  if (parsed === null) throw new Error(`Not a calendar date: ${date}`)
  parsed.setDate(parsed.getDate() + days)
  return toCalendarDate(parsed)
}

/**
 * The window a preset covers, ending on `today` inclusive. `today` is passed
 * in, not read here: it must be the clinic's day (§14), which the caller owns.
 */
export function rangeOf(period: StatsPeriod, today: CalendarDate): StatsRange {
  const { days, bucket } = PERIOD_SHAPE[period]
  return { from: addDays(today, -(days - 1)), to: today, bucket }
}
