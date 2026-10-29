import { queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import { cachePolicy } from '@/shared/config/cache'
import { administratorListSchema, toAdministrator } from '../model/schema'
import type { Administrator } from '../model/types'

/**
 * §6.2 — `clinicId` is inside every key. Not sent to the server, which
 * resolves the tenant from `request.user`; it keeps one account's staff list
 * from being served to another out of memory.
 */
export const administratorKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'administrators'] as const,
  list: (clinicId: number) => [...administratorKeys.scope(clinicId), 'list'] as const,
}

export async function fetchAdministrators(signal?: AbortSignal): Promise<Administrator[]> {
  const raw = await httpClient<unknown>('v1/clinic/admins/', signal === undefined ? {} : { signal })
  return v.parse(administratorListSchema, raw).map(toAdministrator)
}

export const administratorQueries = {
  list: (clinicId: number) =>
    queryOptions({
      queryKey: administratorKeys.list(clinicId),
      queryFn: ({ signal }) => fetchAdministrators(signal),
      // Staff, filed with doctors under §6.3.
      ...cachePolicy.standard,
    }),
}
