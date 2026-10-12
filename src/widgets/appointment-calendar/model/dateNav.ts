import { type CalendarDate, parseCalendarDate, toCalendarDate } from '@/shared/lib/calendarDate'

/** A day before/after the given one. Falls back to the input on a bad date rather than throwing. */
export function shiftCalendarDate(date: CalendarDate, days: number): CalendarDate {
  const parsed = parseCalendarDate(date)
  if (parsed === null) return date

  const shifted = new Date(parsed)
  shifted.setDate(shifted.getDate() + days)
  return toCalendarDate(shifted)
}

// Lives in `shared` so the appointment entity can fetch a week day by day.
export { weekDatesOf } from '@/shared/lib/calendarDate'
