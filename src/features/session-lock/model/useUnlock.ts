import { useMutation, useQueryClient } from '@tanstack/react-query'
import { parseSession, type Session, sessionKeys } from '@/entities/session'
import { httpClient } from '@/shared/api/httpClient'
import { useLockStore } from './lockStore'

/**
 * Re-authenticates against the same endpoint the login form uses.
 *
 * Deliberately not imported from `features/auth-login`: two slices in the same
 * layer cannot see each other (§4), and they compose only one layer up. The
 * duplication is a few lines and the alternative is a dependency the linter
 * would reject.
 *
 * Re-authenticating rather than merely checking a password also rotates the
 * server session, which is the safer outcome for a screen that was unattended.
 */
async function unlockRequest(input: { email: string; password: string }): Promise<Session> {
  const raw = await httpClient<unknown>('auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseSession(raw)
}

export function useUnlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: unlockRequest,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionKeys.me(), session)
      useLockStore.getState().unlock()
    },
  })
}
