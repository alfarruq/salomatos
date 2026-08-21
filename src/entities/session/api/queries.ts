import { queryOptions, useQuery } from '@tanstack/react-query'
import { httpClient } from '@/shared/api/httpClient'
import { cachePolicy } from '@/shared/config/cache'
import { parseSession } from '../model/sessionSchema'
import type { Session } from '../model/types'

/**
 * The one query key with no `clinicId` in it, and the reason the rule holds
 * everywhere else: this response is what *tells* the app which clinic is
 * active. Scoping it by clinic would be circular (§6.2).
 */
export const sessionKeys = {
  root: () => ['session'] as const,
  me: () => [...sessionKeys.root(), 'me'] as const,
}

export async function fetchSession(signal?: AbortSignal): Promise<Session> {
  const raw = await httpClient<unknown>('me/', signal === undefined ? {} : { signal })
  // Parsed, not cast: a serializer that drops `permissions` should fail loudly
  // here rather than render an empty sidebar.
  return parseSession(raw)
}

export const sessionQueries = {
  me: () =>
    queryOptions({
      queryKey: sessionKeys.me(),
      queryFn: ({ signal }) => fetchSession(signal),
      ...cachePolicy.standard,
      // A 401 means signed out. Retrying cannot change that, and each attempt
      // delays the redirect to /login.
      retry: false,
    }),
}

/**
 * The session as React should read it: from the query, not the store.
 *
 * The store exists for code that cannot subscribe — the HTTP client needs the
 * clinic id on every request — and is kept in step by a provider effect. A
 * component reading it directly would depend on that side channel having run,
 * and would not re-render when switching clinics writes a new session into the
 * cache.
 *
 * Returns undefined only before the guard has resolved; inside `_auth` it is
 * always present.
 */
export function useSession(): Session | undefined {
  return useQuery(sessionQueries.me()).data
}
