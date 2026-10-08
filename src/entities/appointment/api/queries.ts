import { queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import { cachePolicy } from '@/shared/config/cache'
import { appointmentListSchema, toAppointment } from '../model/schema'
import type { Appointment, AppointmentFilters } from '../model/types'

/** §6.2 — `clinicId` is inside every key, without exception. */
export const appointmentKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'appointments'] as const,
  list: (clinicId: number, filters: AppointmentFilters) =>
    [...appointmentKeys.scope(clinicId), 'list', filters] as const,
}

/**
 * ⚠️ Day/week are still a guess for anything but today: the endpoint was
 * shown as `?date=day` / `?date=week`, with no example of viewing a day
 * other than today. Day navigation needs an actual date, so this sends one
 * (`?date=2026-09-28`) instead of the literal word. Week navigation was
 * asked to wait for backend confirmation, so it still sends the literal
 * `week` shortcut unconditionally. `all` is confirmed, not guessed: no
 * `date` parameter at all.
 */
function toQueryString(filters: AppointmentFilters): string {
  if (filters.view === 'all') return ''
  return `?date=${filters.view === 'week' ? 'week' : filters.date}`
}

/**
 * Reads either a plain array or a paginated envelope — unconfirmed which this
 * endpoint sends, and `entities/treatment-type` already learned the cost of
 * guessing wrong here: assuming "plain array" silently dropped every row past
 * the first page in production.
 */
function rowsOf(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (
    typeof raw === 'object' &&
    raw !== null &&
    Array.isArray((raw as { results?: unknown }).results)
  ) {
    return (raw as { results: unknown[] }).results
  }
  return raw as unknown[]
}

export async function fetchAppointments(
  filters: AppointmentFilters,
  signal?: AbortSignal,
): Promise<Appointment[]> {
  const raw = await httpClient<unknown>(
    `v1/calendars/appointments/${toQueryString(filters)}`,
    signal === undefined ? {} : { signal },
  )
  return v.parse(appointmentListSchema, rowsOf(raw)).map(toAppointment)
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
