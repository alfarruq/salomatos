import { useMutation, useQueryClient } from '@tanstack/react-query'
import { parseSession, type Session, sessionKeys } from '@/entities/session'
import { httpClient } from '@/shared/api/httpClient'
import type { LoginInput } from './schema'

async function login(input: LoginInput): Promise<Session> {
  const raw = await httpClient<unknown>('auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: input.email, password: input.password }),
  })
  return parseSession(raw)
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: login,
    // retry is already false globally (§6.4); repeating a failed sign-in would
    // walk the user into a rate limit.

    onSuccess: (session) => {
      /*
       * Seeds the cache instead of invalidating it: the login response is the
       * same payload `/api/me/` returns, so refetching it immediately would be
       * a second round trip for data already in hand.
       */
      queryClient.setQueryData(sessionKeys.me(), session)
    },
  })
}
