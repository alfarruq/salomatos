import { type CalendarDate, parseCalendarDate, toCalendarDate } from '@/shared/lib/calendarDate'

/** A day before/after the given one. Falls back to the input on a bad date rather than throwing. */
export function shiftCalendarDate(date: CalendarDate, days: number): CalendarDate {
  const parsed = parseCalendarDate(date)
  if (parsed === null) return date

  const shifted = new Date(parsed)
  shifted.setDate(shifted.getDate() + days)
  return toCalendarDate(shifted)
}

/**
 * Monday through Sunday of the week containing `reference` — matches the
 * board's Monday-first columns. Falls back to today on a bad date.
 */
export function weekDatesOf(reference: CalendarDate): CalendarDate[] {
  const parsed = parseCalendarDate(reference) ?? new Date()
  // `getDay()` is 0 for Sunday; shift so Monday is the start of the week.
  const mondayOffset = (parsed.getDay() + 6) % 7
  const monday = new Date(parsed)
  monday.setDate(parsed.getDate() - mondayOffset)

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)
    return toCalendarDate(day)
  })
}
