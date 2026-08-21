import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSessionStore } from '@/entities/session'
import { httpClient } from '@/shared/api/httpClient'

async function logout(): Promise<void> {
  await httpClient<void>('auth/logout/', { method: 'POST' })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,

    /*
     * `onSettled`, not `onSuccess`: if the request fails the user still asked
     * to leave, and the next member of staff at a shared reception desk must
     * not find the previous one's patients on screen (§13.4). The server-side
     * session may outlive this, but the browser keeps nothing either way.
     */
    onSettled: () => {
      useSessionStore.getState().clear()
      // Not invalidate — that would refetch. Everything cached belongs to the
      // person who just left.
      queryClient.clear()
    },
  })
}
