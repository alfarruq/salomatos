import { useMutation, useQueryClient } from '@tanstack/react-query'
import { parseSession, type Session, sessionKeys, useSessionStore } from '@/entities/session'
import { httpClient } from '@/shared/api/httpClient'

async function switchClinic(clinicId: string): Promise<Session> {
  const raw = await httpClient<unknown>('me/active-clinic/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clinic_id: clinicId }),
  })
  return parseSession(raw)
}

/**
 * 🔴 The security-critical mutation in the app.
 *
 * §6.2: every query key is scoped by clinic, but that alone is not enough —
 * the previous clinic's data is still sitting in the cache, and a stale render
 * or a devtools poke could surface it. Clearing the whole cache on switch is
 * the belt to that braces. Showing one clinic's patients to another clinic's
 * staff is a data leak with legal consequences, not a display bug.
 *
 * E2E scenario 5 in §16.2 exists to prove this keeps working.
 */
export function useSwitchClinic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: switchClinic,

    onSuccess: (session) => {
      // Order matters: drop everything first, then seed the new session, so
      // there is no moment where the new clinic id sits beside old data.
      queryClient.clear()
      useSessionStore.getState().setSession(session)
      queryClient.setQueryData(sessionKeys.me(), session)
    },
  })
}
