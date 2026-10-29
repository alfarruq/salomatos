import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  type Compensation,
  type CompensationPayload,
  compensationSchema,
  expenseKeys,
  toCompensation,
} from '@/entities/expense'
import { httpClient } from '@/shared/api/httpClient'

export interface SetCompensationInput {
  doctorId: number
  payload: CompensationPayload
}

/** Always a new entry: the server keeps every earlier one, so settled months keep their terms. */
async function setCompensation({ doctorId, payload }: SetCompensationInput): Promise<Compensation> {
  const raw = await httpClient<unknown>(`v1/finance/doctors/${doctorId}/compensation/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return toCompensation(v.parse(compensationSchema, raw))
}

/** ⛔ No optimistic update: every accrual is recomputed by the server (§10). */
export function useSetCompensation(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: setCompensation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.scope(clinicId) })
    },
  })
}
