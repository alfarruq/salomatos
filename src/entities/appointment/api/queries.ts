import { queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import { pathFromNext } from '@/shared/api/pagination'
import { cachePolicy } from '@/shared/config/cache'
import { clinicNow } from '@/shared/lib/datetime'
import { appointmentListSchema, toAppointment } from '../model/schema'
import type { Appointment, AppointmentFilters } from '../model/types'

/** §6.2 — `clinicId` is inside every key, without exception. */
export const appointmentKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'appointments'] as const,
  list: (clinicId: number, filters: AppointmentFilters) =>
    [...appointmentKeys.scope(clinicId), 'list', filters] as const,
}

/**
 * Confirmed live on 2026-10-09: `?date=day` is the only form that filters to
 * today. ⚠️ A real date (`?date=2026-10-09`) is **ignored** — the server
 * answers with every appointment, exactly as with no parameter — so today
 * goes out as the `day` shortcut, and any other day still sends its date and
 * gets the unfiltered list until the backend supports one. "Today" is then
 * the server's own day, in its time zone, not Tashkent's. Week navigation
 * still sends the literal `week` shortcut; `all` sends no `date` at all.
 */
function toQueryString(filters: AppointmentFilters): string {
  if (filters.view === 'all') return ''
  if (filters.view === 'week') return '?date=week'
  return `?date=${filters.date === clinicNow().date ? 'day' : filters.date}`
}

/**
 * One response's rows and where the next page is. The live endpoint sends
 * DRF's page envelope (`count`/`next`, ten per page — confirmed 2026-10-09);
 * a plain array is still read, as one complete page.
 */
function pageOf(raw: unknown): { rows: unknown[]; next: string | null } {
  if (Array.isArray(raw)) return { rows: raw, next: null }
  if (
    typeof raw === 'object' &&
    raw !== null &&
    Array.isArray((raw as { results?: unknown }).results)
  ) {
    const { results, next } = raw as { results: unknown[]; next?: unknown }
    return { rows: results, next: typeof next === 'string' ? next : null }
  }
  return { rows: raw as unknown[], next: null }
}

/**
 * Follows every page: reading only the first silently dropped the eleventh
 * appointment of a day, and today's counts are computed from this list.
 */
export async function fetchAppointments(
  filters: AppointmentFilters,
  signal?: AbortSignal,
): Promise<Appointment[]> {
  const rows: unknown[] = []
  let path: string | null = `v1/calendars/appointments/${toQueryString(filters)}`

  while (path !== null) {
    const raw: unknown = await httpClient<unknown>(path, signal === undefined ? {} : { signal })
    const page = pageOf(raw)
    rows.push(...page.rows)
    path = page.next === null ? null : pathFromNext(page.next)
  }

  return v.parse(appointmentListSchema, rows).map(toAppointment)
}

export const appointmentQueries = {
  list: (clinicId: number, filters: AppointmentFilters) =>
    queryOptions({
      queryKey: appointmentKeys.list(clinicId, filters),
      queryFn: ({ signal }) => fetchAppointments(filters, signal),
      // `live` (§6.3) — today's schedule, exactly what that policy exists for.
      ...cachePolicy.live,
    }),
}
