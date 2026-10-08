import { useMutation, useQueryClient } from '@tanstack/react-query'
import { patientKeys } from '@/entities/patient'
import { treatmentKeys } from '@/entities/treatment'
import { httpClient } from '@/shared/api/httpClient'

/** `DELETE /clinic/treatments/{id}/` — 204, confirmed live. */
async function deleteTreatment(treatmentId: number): Promise<void> {
  await httpClient<void>(`v1/clinic/treatments/${treatmentId}/`, { method: 'DELETE' })
}

/**
 * ⛔ No optimistic update (§6.5): a refused delete should not vanish the row
 * first. Invalidates patients too — the card's totals, tooth chart and the
 * list's status are all derived from treatment rows on the server.
 */
export function useDeleteTreatment(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTreatment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: treatmentKeys.scope(clinicId) })
      void queryClient.invalidateQueries({ queryKey: patientKeys.scope(clinicId) })
    },
  })
}
