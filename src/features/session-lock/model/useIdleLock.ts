import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Session } from '@/entities/session'
import { useSessionStore } from '@/entities/session'
import { IDLE_WARNING_MS, useIdleTimer } from '@/shared/lib/useIdleTimer'
import { toast } from '@/shared/ui'
import { useLockStore } from './lockStore'

const WARNING_TOAST_ID = 'idle-warning'

/**
 * Locks the screen after the idle timeout and clears everything on it (§13.4).
 *
 * The clear is the substantive part. An overlay alone would leave the patient's
 * record in the DOM, one devtools panel or one screenshot away; emptying the
 * cache makes every mounted screen fall back to its loading state, so there is
 * nothing left to see.
 */
export function useIdleLock(session: Session | undefined): void {
  const { t } = useTranslation('auth')
  const queryClient = useQueryClient()
  const isLocked = useLockStore((state) => state.isLocked)

  // Read at lock time rather than captured in a closure, so the timer does not
  // need re-arming every time the session object changes identity.
  const sessionRef = useRef(session)
  sessionRef.current = session

  const handleIdle = useCallback(() => {
    const current = sessionRef.current
    // The username is what the login endpoint takes, and it is not on the
    // session — see the session store. Without it there is nothing to unlock
    // with, so locking would strand the user at a form they cannot submit.
    const username = useSessionStore.getState().username
    if (current === undefined || username === null) return

    // Identity first: clearing the cache takes the session with it.
    useLockStore.getState().lock({ username, name: current.fullName })
    queryClient.clear()
    toast.dismiss(WARNING_TOAST_ID)
  }, [queryClient])

  const handleWarning = useCallback(() => {
    toast.warning(t('lock.warningTitle'), {
      id: WARNING_TOAST_ID,
      description: t('lock.warningBody', { seconds: Math.round(IDLE_WARNING_MS / 1000) }),
      duration: IDLE_WARNING_MS,
    })
  }, [t])

  const handleActive = useCallback(() => {
    toast.dismiss(WARNING_TOAST_ID)
  }, [])

  useIdleTimer({
    onIdle: handleIdle,
    onWarning: handleWarning,
    onActive: handleActive,
    // Pointless while already locked, and there is no session to protect
    // before the guard has resolved one.
    isEnabled: !isLocked && session !== undefined,
  })
}
