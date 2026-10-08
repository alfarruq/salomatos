import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSessionStore } from '@/entities/session'
import { clearSession } from '@/shared/api/authSession'

/**
 * Signing out is entirely local, because there is nothing to tell the server.
 *
 * The backend has no logout route, and no way to revoke a token even in
 * principle: `BLACKLIST_AFTER_ROTATION` is configured but
 * `rest_framework_simplejwt.token_blacklist` is not in `INSTALLED_APPS`, so
 * simplejwt swallows the blacklist call. The issued token stays valid until it
 * expires — a day, by default.
 *
 * ⚠️ Which means this protects the *screen*, not the credential. Dropping the
 * token puts it beyond the reach of this page, and that is the realistic threat
 * on a shared reception machine; a token already captured off the wire is not
 * something the frontend can call back. Fixing that is server-side (§A5 of the
 * backend review).
 *
 * Still a mutation rather than a plain function: callers already treat signing
 * out as an async action with a pending state, and keeping the shape means the
 * call sites do not change when a real endpoint appears.
 */
export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      clearSession()
    },

    /*
     * `onSettled`, not `onSuccess`: the user asked to leave, and the next
     * member of staff at a shared reception desk must not find the previous
     * one's patients on screen (§13.4).
     */
    onSettled: () => {
      useSessionStore.getState().clear()
      // Not invalidate — that would refetch. Everything cached belongs to the
      // person who just left.
      queryClient.clear()
    },
  })
}
