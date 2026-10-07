import { queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import { cachePolicy } from '@/shared/config/cache'
import { toTreatment, treatmentListSchema } from '../model/schema'
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
}

export async function fetchTreatments(
  patientId: number,
  signal?: AbortSignal,
): Promise<Treatment[]> {
  const raw = await httpClient<unknown>(
    `v1/clinic/treatments/?patient_id=${patientId}`,
    signal === undefined ? {} : { signal },
  )
  return v.parse(treatmentListSchema, raw).map(toTreatment)
}

export const treatmentQueries = {
  list: (clinicId: number, patientId: number) =>
    queryOptions({
      queryKey: treatmentKeys.list(clinicId, patientId),
      queryFn: ({ signal }) => fetchTreatments(patientId, signal),
      ...cachePolicy.standard,
    }),
}
