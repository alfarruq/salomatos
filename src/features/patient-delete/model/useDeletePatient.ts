import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type PatientId, patientKeys } from '@/entities/patient'
import { httpClient } from '@/shared/api/httpClient'

async function deletePatient(patientId: PatientId): Promise<void> {
  await httpClient<void>(`v1/clinic/patients/${patientId}/`, { method: 'DELETE' })
}

/** ⛔ No optimistic update (§6.5): a refused delete should not vanish the record first. */
export function useDeletePatient(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deletePatient,
    onSuccess: (_void, patientId) => {
      queryClient.removeQueries({ queryKey: patientKeys.detail(clinicId, patientId) })
      void queryClient.invalidateQueries({ queryKey: patientKeys.scope(clinicId) })
    },
  })
}
