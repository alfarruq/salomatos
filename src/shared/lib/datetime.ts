/**
 * Instants — a moment in time, as opposed to a calendar date.
 *
 * §12.4's rules, and the reason for each:
 *
 *   The backend always sends UTC ISO-8601. One source of truth.
 *   Conversion happens only at display time. Business logic stays in UTC.
 *   Formatting is `Intl`, never hand-rolled. Every language formats differently.
 *   The zone is the clinic's, not the browser's — staff travel, clinics do not.
 *
 * An appointment sliding by an hour is a serious incident in a medical system,
 * which is why none of this is left to the caller to remember.
 *
 * For a *date* with no time — a birth date, a report range — use
 * `calendarDate.ts`, which keeps timezones out of the question entirely.
 */

/**
 * ADR-010: a constant, because Uzbekistan is a single zone (UTC+5) with no
 * daylight saving. When clinics span zones this becomes a field on the clinic,
 * and only this module changes — which is the point of it being here.
 */
export const CLINIC_TZ = 'Asia/Tashkent'

/** Rejects a value the backend should never have sent, rather than rendering "Invalid Date". */
function parseInstant(utcIso: string): Date {
  const parsed = new Date(utcIso)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ISO-8601 instant: ${utcIso}`)
  }
  return parsed
}

export interface FormatOptions {
  /** BCP-47 tag, from the active i18n language. */
  locale: string
  /** Override the clinic zone. Almost never right — see the module comment. */
  timeZone?: string
}

/** `21 avg 2026, 14:30` — the default for anything on a schedule. */
export function formatDateTime(utcIso: string, { locale, timeZone }: FormatOptions): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timeZone ?? CLINIC_TZ,
  }).format(parseInstant(utcIso))
}

/** `21 avg 2026` — when the time of day is not the point. */
export function formatDate(utcIso: string, { locale, timeZone }: FormatOptions): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: timeZone ?? CLINIC_TZ,
  }).format(parseInstant(utcIso))
}

/** `14:30` — for a column of appointment times, where the date is a heading. */
export function formatTime(utcIso: string, { locale, timeZone }: FormatOptions): string {
  return new Intl.DateTimeFormat(locale, {
    timeStyle: 'short',
    timeZone: timeZone ?? CLINIC_TZ,
  }).format(parseInstant(utcIso))
}

/**
 * The clinic's calendar day for an instant, as `yyyy-MM-dd`.
 *
 * Not `toISOString().slice(0, 10)`: that is the *UTC* day, and an appointment
 * at 02:00 Tashkent belongs to a day that UTC still calls yesterday.
 */
export function clinicDayOf(utcIso: string, timeZone: string = CLINIC_TZ): string {
  // `en-CA` because its short date format is exactly ISO order.
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(parseInstant(utcIso))
}
