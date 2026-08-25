/**
 * Calendar dates — a day on a wall calendar, with no time and no zone.
 *
 * §12.4 is strict about timezones because an appointment sliding by an hour is
 * a serious incident. The safest way to handle a *date* is to never let a
 * timezone near it: `new Date('2026-08-21')` parses as UTC midnight, which
 * renders as the 20th anywhere west of Greenwich. So these helpers build and
 * read `Date` objects from local calendar parts only, and the wire format is
 * a plain `yyyy-MM-dd` string.
 *
 * Instants — when an appointment actually starts — are a different type and
 * belong in `datetime.ts` with CLINIC_TZ.
 */

/** `yyyy-MM-dd`. */
export type CalendarDate = string

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function toCalendarDate(date: Date): CalendarDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Returns null for anything that is not a real calendar date. */
export function parseCalendarDate(value: string): Date | null {
  const match = ISO_DATE.exec(value)
  if (!match) return null

  const [, year, month, day] = match
  const parsed = new Date(Number(year), Number(month) - 1, Number(day))

  // Rejects 2026-02-31, which JavaScript would happily roll into March.
  return toCalendarDate(parsed) === value ? parsed : null
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function todayCalendarDate(): CalendarDate {
  return toCalendarDate(new Date())
}

/**
 * `2026-08-24` → `24 avg 2026`, in the active language.
 *
 * No `timeZone` option, deliberately: the `Date` built by `parseCalendarDate`
 * is local midnight of that calendar day, so `Intl` formats the day that was
 * asked for. Passing a zone here would reintroduce the shift this module
 * exists to prevent.
 *
 * Returns null for a value that is not a real date, so a caller renders
 * nothing rather than "Invalid Date".
 */
export function formatCalendarDate(value: CalendarDate, locale: string): string | null {
  const parsed = parseCalendarDate(value)
  if (parsed === null) return null

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parsed)
}
