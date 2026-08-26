import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionKeys } from '@/entities/session'
import { httpClient } from '@/shared/api/httpClient'
import { type ClinicProfileInput, toClinicProfilePayload } from './schema'

/**
 * Updates the clinic's own record.
 *
 * ⚠️ This is `PATCH /authentication/update/{id}/` — the endpoint that performs
 * no ownership check at all (item 3 in the backend review). Passing our own id
 * is legitimate use of it; the same call with anyone else's id would edit that
 * account, which is why it is on the list to be fixed server-side.
 */
async function updateClinicProfile({
  userId,
  input,
}: {
  userId: number
  input: ClinicProfileInput
}): Promise<void> {
  await httpClient<unknown>(`v1/authentication/update/${userId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toClinicProfilePayload(input)),
  })
}

export function useUpdateClinicProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateClinicProfile,

    onSuccess: () => {
      /*
       * Invalidate rather than write the response into the cache: the update
       * endpoint answers with `UserUpdateSerializer`, which is a different
       * shape from the `/me/` response the session is built from. Refetching
       * keeps one parser and one source of truth — and the clinic's name is on
       * screen in the header, so it has to change immediately.
       */
      void queryClient.invalidateQueries({ queryKey: sessionKeys.me() })
    },
  })
}
