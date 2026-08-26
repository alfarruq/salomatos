import { queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import { cachePolicy } from '@/shared/config/cache'
import { toTreatmentType, treatmentTypeListSchema } from '../model/schema'
import type { TreatmentType } from '../model/types'

/** §6.2 — `clinicId` is inside every key, without exception. */
export const treatmentTypeKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'treatment-types'] as const,
  list: (clinicId: number) => [...treatmentTypeKeys.scope(clinicId), 'list'] as const,
}

export async function fetchTreatmentTypes(signal?: AbortSignal): Promise<TreatmentType[]> {
  const raw = await httpClient<unknown>(
    'v1/clinic/treatment-types/',
    signal === undefined ? {} : { signal },
  )
  // A plain array — this endpoint does not paginate. See the schema module.
  return v.parse(treatmentTypeListSchema, raw).map(toTreatmentType)
}

export const treatmentTypeQueries = {
  list: (clinicId: number) =>
    queryOptions({
      queryKey: treatmentTypeKeys.list(clinicId),
      queryFn: ({ signal }) => fetchTreatmentTypes(signal),
      /*
       * `static` — §6.3 names exactly this: services and reference data. A
       * price list changes a few times a year, and every treatment form and
       * appointment screen will read it. Refetching that every five minutes
       * across a thousand clinics is the load problem §6.3 exists to prevent.
       */
      ...cachePolicy.static,
    }),
}
