import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import { type Page, pathFromNext } from '@/shared/api/pagination'
import { cachePolicy } from '@/shared/config/cache'
import { type TreatmentResponse, toTreatment, treatmentListResponseSchema } from '../model/schema'
import type { Treatment, TreatmentListFilters } from '../model/types'

/**
 * §6.2: `clinicId` is inside every key even though the request itself is
 * scoped by `patient_id`, not by clinic — the id is not sent to the server
 * (this backend resolves the tenant from `request.user`), it is here so the
 * *cache* cannot serve one clinic's treatment history to the next account
 * signed in on the same machine.
 */
export const treatmentKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'treatments'] as const,

  list: (clinicId: number, patientId: number) =>
    [...treatmentKeys.scope(clinicId), 'list', patientId] as const,

  /** The clinic-wide table, one server page at a time. Under `scope`, so every mutation's invalidation reaches it. */
  page: (clinicId: number, filters: TreatmentListFilters) =>
    [...treatmentKeys.scope(clinicId), 'page', filters] as const,
}

/**
 * Follows every page: one patient's history is tens of rows, and a page size
 * of ten would otherwise silently cut it off with no control to see the rest.
 */
export async function fetchTreatments(
  patientId: number,
  signal?: AbortSignal,
): Promise<Treatment[]> {
  const rows: TreatmentResponse[] = []
  let path: string | null = `v1/clinic/treatments/?patient_id=${patientId}`

  while (path !== null) {
    const raw: unknown = await httpClient(path, signal === undefined ? {} : { signal })
    const parsed = v.parse(treatmentListResponseSchema, raw)

    if (Array.isArray(parsed)) {
      rows.push(...parsed)
      path = null
    } else {
      rows.push(...parsed.results)
      path = parsed.next === null ? null : pathFromNext(parsed.next)
    }
  }

  return rows.map(toTreatment)
}

function toPageQuery(filters: TreatmentListFilters): string {
  const params = new URLSearchParams({ page: String(filters.page) })
  if (filters.patientId !== null) params.set('patient_id', String(filters.patientId))
  if (filters.doctorId !== null) params.set('doctor_id', String(filters.doctorId))
  if (filters.treatmentTypeId !== null) {
    params.set('treatment_type_id', String(filters.treatmentTypeId))
  }
  if (filters.debt !== null) params.set('remaining', filters.debt === 'with' ? 'true' : 'false')
  return params.toString()
}

/**
 * One page of the clinic's treatments — the same endpoint, filtered server
 * side by `patient_id`, `doctor_id`, `treatment_type_id` and `remaining`
 * (all confirmed live on 2026-10-14, and combinable).
 */
export async function fetchTreatmentPage(
  filters: TreatmentListFilters,
  signal?: AbortSignal,
): Promise<Page<Treatment>> {
  const raw: unknown = await httpClient(
    `v1/clinic/treatments/?${toPageQuery(filters)}`,
    signal === undefined ? {} : { signal },
  )
  const parsed = v.parse(treatmentListResponseSchema, raw)

  // A plain array would be the whole list at once — read it as one page.
  if (Array.isArray(parsed)) {
    return { count: parsed.length, next: null, previous: null, results: parsed.map(toTreatment) }
  }
  return { ...parsed, results: parsed.results.map(toTreatment) }
}

export const treatmentQueries = {
  list: (clinicId: number, patientId: number) =>
    queryOptions({
      queryKey: treatmentKeys.list(clinicId, patientId),
      queryFn: ({ signal }) => fetchTreatments(patientId, signal),
      ...cachePolicy.standard,
    }),

  page: (clinicId: number, filters: TreatmentListFilters) =>
    queryOptions({
      queryKey: treatmentKeys.page(clinicId, filters),
      queryFn: ({ signal }) => fetchTreatmentPage(filters, signal),
      ...cachePolicy.standard,
      // Keeps the current rows on screen while the next page loads.
      placeholderData: keepPreviousData,
    }),
}
