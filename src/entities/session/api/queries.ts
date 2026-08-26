import { queryOptions, useQuery } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/errors'
import { httpClient } from '@/shared/api/httpClient'
import { getAccessToken } from '@/shared/api/tokenStore'
import { cachePolicy } from '@/shared/config/cache'
import { readJwtPayload } from '@/shared/lib/jwt'
import { parseSession } from '../model/sessionSchema'
import type { Session } from '../model/types'

/**
 * The one query key with no `clinicId` in it, and the reason the rule holds
 * everywhere else: this response is what *tells* the app which tenant is
 * active. Scoping it by tenant would be circular (§6.2).
 */
export const sessionKeys = {
  root: () => ['session'] as const,
  me: () => [...sessionKeys.root(), 'me'] as const,
}

export async function fetchSession(signal?: AbortSignal): Promise<Session> {
  /*
   * The user id is read from the token before the request, not from the
   * response after it — `/api/me/` does not return one.
   *
   * Doing it first also turns "no token" into an immediate `unauthorized`
   * without a round trip, which is the common case: the token lives only in
   * memory, so every page reload starts here and the guard can redirect to
   * /login without waiting on a request that is certain to 401.
   */
  const token = getAccessToken()

  // No token is the ordinary case: it lives in memory, so every page reload
  // starts here and the guard redirects to /login without a round trip.
  if (token === null) {
    throw new ApiError({ kind: 'unauthorized', messageKey: 'no_access_token' })
  }

  /*
   * A token that cannot be read is a different thing entirely, and has to say
   * so. It means the server issued something this client does not understand
   * — a missing or unexpected `user_id` claim — and the tenant every query key
   * is scoped by cannot be established.
   *
   * Reported separately because the two are indistinguishable from the login
   * form otherwise, and the second one looked exactly like a wrong password.
   */
  const payload = readJwtPayload(token)
  if (payload === null) {
    throw new ApiError({ kind: 'unauthorized', messageKey: 'unreadable_token' })
  }

  const raw = await httpClient<unknown>(
    'v1/authentication/me/',
    signal === undefined ? {} : { signal },
  )
  // Parsed, not cast: a serializer that drops `role` should fail loudly here
  // rather than render an application with every control hidden.
  return parseSession(raw, payload.userId)
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
 * The store exists for narrow selectors — `useCan` subscribes to one
 * permission rather than the whole session — and is kept in step by a provider
 * effect. Returns undefined only before the guard has resolved; inside `_auth`
 * it is always present.
 */
export function useSession(): Session | undefined {
  return useQuery(sessionQueries.me()).data
}
