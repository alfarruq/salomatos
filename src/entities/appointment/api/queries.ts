import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import { type Page, pathFromNext } from '@/shared/api/pagination'
import { cachePolicy } from '@/shared/config/cache'
import { appointmentListSchema, toAppointment } from '../model/schema'
import type { Appointment, AppointmentFilters } from '../model/types'

/** §6.2 — `clinicId` is inside every key, without exception. */
export const appointmentKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'appointments'] as const,
  list: (clinicId: number, filters: AppointmentFilters) =>
    [...appointmentKeys.scope(clinicId), 'list', filters] as const,
  page: (clinicId: number, filters: AppointmentFilters, page: number) =>
    [...appointmentKeys.scope(clinicId), 'page', filters, page] as const,
}

/**
 * The backend filters by a real date since its 2026-10-12 update
 * (`?date=2026-10-12`), so the day view always sends the date it shows —
 * including today, which is then the clinic's day rather than the server's.
 * Week navigation still sends the literal `week` shortcut; `all` sends no
 * `date` at all.
 */
function toQueryString(filters: AppointmentFilters): string {
  if (filters.view === 'all') return ''
  if (filters.view === 'week') return '?date=week'
  return `?date=${filters.date}`
}

/**
 * One response's rows and where the next page is. The live endpoint sends
 * DRF's page envelope (`count`/`next`, ten per page — confirmed 2026-10-09);
 * a plain array is still read, as one complete page.
 */
function pageOf(raw: unknown): Page<unknown> {
  if (Array.isArray(raw)) return { count: raw.length, next: null, previous: null, results: raw }
  if (
    typeof raw === 'object' &&
    raw !== null &&
    Array.isArray((raw as { results?: unknown }).results)
  ) {
    const { results, next, previous, count } = raw as {
      results: unknown[]
      next?: unknown
      previous?: unknown
      count?: unknown
    }
    return {
      count: typeof count === 'number' ? count : results.length,
      next: typeof next === 'string' ? next : null,
      previous: typeof previous === 'string' ? previous : null,
      results,
    }
  }
  return { count: 0, next: null, previous: null, results: raw as unknown[] }
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
    rows.push(...page.results)
    path = page.next === null ? null : pathFromNext(page.next)
  }

  return v.parse(appointmentListSchema, rows).map(toAppointment)
}

/**
 * One server page (`?page=N`, `PAGE_SIZE` rows) for the week and all views,
 * where the list is long enough that loading every page up front is the cost.
 */
export async function fetchAppointmentPage(
  filters: AppointmentFilters,
  page: number,
  signal?: AbortSignal,
): Promise<Page<Appointment>> {
  const params = new URLSearchParams(toQueryString(filters))
  if (page > 1) params.set('page', String(page))
  const query = params.toString()

  const raw: unknown = await httpClient<unknown>(
    `v1/calendars/appointments/${query === '' ? '' : `?${query}`}`,
    signal === undefined ? {} : { signal },
  )
  const { results, ...rest } = pageOf(raw)
  return { ...rest, results: v.parse(appointmentListSchema, results).map(toAppointment) }
}

export const appointmentQueries = {
  list: (clinicId: number, filters: AppointmentFilters) =>
    queryOptions({
      queryKey: appointmentKeys.list(clinicId, filters),
      queryFn: ({ signal }) => fetchAppointments(filters, signal),
      // `live` (§6.3) — today's schedule, exactly what that policy exists for.
      ...cachePolicy.live,
    }),

  page: (clinicId: number, filters: AppointmentFilters, page: number) =>
    queryOptions({
      queryKey: appointmentKeys.page(clinicId, filters, page),
      queryFn: ({ signal }) => fetchAppointmentPage(filters, page, signal),
      ...cachePolicy.live,
      // Paging keeps the current page on screen instead of flashing a skeleton.
      placeholderData: keepPreviousData,
    }),
}
