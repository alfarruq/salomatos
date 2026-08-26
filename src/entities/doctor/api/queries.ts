import { queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import { cachePolicy } from '@/shared/config/cache'
import { doctorListSchema, toDoctor } from '../model/schema'
import type { Doctor } from '../model/types'

/**
 * §6.2 — `clinicId` is inside every key, without exception.
 *
 * It is not sent to the server, which resolves the tenant from `request.user`.
 * The id is here for the cache: without it, a second account on the same
 * machine would be served the first one's staff list out of memory.
 */
export const doctorKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'doctors'] as const,
  list: (clinicId: number) => [...doctorKeys.scope(clinicId), 'list'] as const,
}

export async function fetchDoctors(signal?: AbortSignal): Promise<Doctor[]> {
  const raw = await httpClient<unknown>(
    'v1/clinic/doctors/',
    signal === undefined ? {} : { signal },
  )
  // A plain array — this endpoint does not paginate. See the schema module.
  return v.parse(doctorListSchema, raw).map(toDoctor)
}

export const doctorQueries = {
  list: (clinicId: number) =>
    queryOptions({
      queryKey: doctorKeys.list(clinicId),
      queryFn: ({ signal }) => fetchDoctors(signal),
      /*
       * `standard`, not `static`: §6.3 files staff alongside patients and
       * prices. A clinic hires rarely, but when it does the new doctor has to
       * appear in the appointment form the same day, not an hour later.
       */
      ...cachePolicy.standard,
    }),
}
