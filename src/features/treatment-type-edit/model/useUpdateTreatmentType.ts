import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  type TreatmentType,
  type TreatmentTypeFormInput,
  type TreatmentTypeId,
  toTreatmentType,
  toTreatmentTypePayload,
  treatmentTypeKeys,
  treatmentTypeSchema,
} from '@/entities/treatment-type'
import { httpClient } from '@/shared/api/httpClient'

/**
 * ⚠️ `update_treatment_type` calls `get_treatment_type(id)` with no tenant
 * argument, so the server will edit another clinic's price list if given the
 * id — item 3 in the backend review. Not something the client can close.
 */
async function updateTreatmentType({
  treatmentTypeId,
  input,
}: {
  treatmentTypeId: TreatmentTypeId
  input: TreatmentTypeFormInput
}): Promise<TreatmentType> {
  const raw = await httpClient<unknown>(`v1/clinic/treatment-types/${treatmentTypeId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toTreatmentTypePayload(input)),
  })

  return toTreatmentType(v.parse(treatmentTypeSchema, raw))
}

/**
 * ⛔ No optimistic update, and here it matters more than usual: a price is
 * what gets quoted to a patient. Showing one the server refused would mean
 * quoting a number nobody saved.
 */
export function useUpdateTreatmentType(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTreatmentType,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: treatmentTypeKeys.scope(clinicId) })
    },
  })
}
