import { queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import { cachePolicy } from '@/shared/config/cache'
import { doctorTypeListSchema, toDoctorType } from '../model/schema'
import type { DoctorType } from '../model/types'

/** §6.2 — `clinicId` is inside every key, without exception. */
export const doctorTypeKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'doctor-types'] as const,
  list: (clinicId: number) => [...doctorTypeKeys.scope(clinicId), 'list'] as const,
}

export async function fetchDoctorTypes(signal?: AbortSignal): Promise<DoctorType[]> {
  const raw = await httpClient<unknown>(
    'v1/clinic/doctors/types/',
    signal === undefined ? {} : { signal },
  )
  // A plain array — this endpoint does not paginate. See the schema module.
  return v.parse(doctorTypeListSchema, raw).map(toDoctorType)
}

export const doctorTypeQueries = {
  list: (clinicId: number) =>
    queryOptions({
      queryKey: doctorTypeKeys.list(clinicId),
      queryFn: ({ signal }) => fetchDoctorTypes(signal),
      // `static` (§6.3) — a clinic's list of doctor categories changes about
      // as often as its price list, and any doctor form will read it.
      ...cachePolicy.static,
    }),
}
