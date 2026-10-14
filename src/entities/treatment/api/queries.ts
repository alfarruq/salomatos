import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import { type Page, pathFromNext } from '@/shared/api/pagination'
import { cachePolicy } from '@/shared/config/cache'
import { type TreatmentResponse, toTreatment, treatmentListResponseSchema } from '../model/schema'
import type { Treatment } from '../model/types'

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
  page: (clinicId: number, page: number) =>
    [...treatmentKeys.scope(clinicId), 'page', page] as const,
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

/**
 * One page of every treatment in the clinic — the same endpoint without
 * `patient_id`. Confirmed live 2026-10-14: only `page`/`page_size` are
 * honoured; `search`, `status`, `doctor` and the rest are silently ignored,
 * which is why the table has no filters yet.
 */
export async function fetchTreatmentPage(
  page: number,
  signal?: AbortSignal,
): Promise<Page<Treatment>> {
  const raw: unknown = await httpClient(
    `v1/clinic/treatments/?page=${page}`,
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

  page: (clinicId: number, page: number) =>
    queryOptions({
      queryKey: treatmentKeys.page(clinicId, page),
      queryFn: ({ signal }) => fetchTreatmentPage(page, signal),
      ...cachePolicy.standard,
      // Keeps the current rows on screen while the next page loads.
      placeholderData: keepPreviousData,
    }),
}
