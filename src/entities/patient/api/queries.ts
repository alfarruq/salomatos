import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import type { Page } from '@/shared/api/pagination'
import { cachePolicy } from '@/shared/config/cache'
import {
  patientDetailSchema,
  patientPageSchema,
  toPatient,
  toPatientListItem,
} from '../model/schema'
import type { Patient, PatientFilters, PatientId, PatientListItem } from '../model/types'

/**
 * §6.1's mandatory shape, and §6.2's mandatory rule: **`clinicId` is inside
 * every key, without exception.**
 *
 * It is not sent to the server — this backend resolves the tenant from
 * `request.user` and ignores anything the client claims. The id is here for the
 * *cache*, which is where the leak would happen: without it, a second account
 * on the same machine would be served the first one's patients out of memory
 * before any request went out. That is a data leak, not a display bug.
 */
export const patientKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'patients'] as const,

  list: (clinicId: number, filters: PatientFilters) =>
    [...patientKeys.scope(clinicId), 'list', filters] as const,

  detail: (clinicId: number, patientId: PatientId) =>
    [...patientKeys.scope(clinicId), 'detail', patientId] as const,
}

function toQueryString(filters: PatientFilters): string {
  const params = new URLSearchParams()

  // Only what is set: an empty `?search=` is a different cache entry on some
  // backends and noise in the log on all of them.
  if (filters.search !== '') params.set('search', filters.search)
  if (filters.status !== null) params.set('status', filters.status)
  if (filters.doctor !== '') params.set('doctor', filters.doctor)
  if (filters.treatmentTypeId !== null) params.set('treatment_id', String(filters.treatmentTypeId))
  if (filters.page > 1) params.set('page', String(filters.page))

  const query = params.toString()
  return query === '' ? '' : `?${query}`
}

export async function fetchPatients(
  filters: PatientFilters,
  signal?: AbortSignal,
): Promise<Page<PatientListItem>> {
  const raw = await httpClient<unknown>(
    `v1/clinic/patients/${toQueryString(filters)}`,
    signal === undefined ? {} : { signal },
  )

  const page = v.parse(patientPageSchema, raw)
  return { ...page, results: page.results.map(toPatientListItem) }
}

export async function fetchPatient(patientId: PatientId, signal?: AbortSignal): Promise<Patient> {
  const raw = await httpClient<unknown>(
    `v1/clinic/patients/${patientId}/`,
    signal === undefined ? {} : { signal },
  )
  return toPatient(v.parse(patientDetailSchema, raw))
}

export const patientQueries = {
  list: (clinicId: number, filters: PatientFilters) =>
    queryOptions({
      queryKey: patientKeys.list(clinicId, filters),
      queryFn: ({ signal }) => fetchPatients(filters, signal),
      ...cachePolicy.standard,
      /*
       * Keeps the previous page on screen while the next one loads, so paging
       * and typing in the search box do not blank the table on every keystroke.
       * §15's four states still apply — this only affects the transition
       * between two successful results.
       */
      placeholderData: keepPreviousData,
    }),

  detail: (clinicId: number, patientId: PatientId) =>
    queryOptions({
      queryKey: patientKeys.detail(clinicId, patientId),
      queryFn: ({ signal }) => fetchPatient(patientId, signal),
      ...cachePolicy.standard,
    }),
}
