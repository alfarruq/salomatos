import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  type Compensation,
  type CompensationPayload,
  compensationSchema,
  expenseKeys,
  mockExpenseServer,
  toCompensation,
} from '@/entities/expense'

export interface SetCompensationInput {
  doctorId: number
  payload: CompensationPayload
}

/**
 * ⚠️ Mock until `POST /api/v1/clinic/doctors/{id}/compensation/` exists. The real call:
 *
 *   const raw = await httpClient<unknown>(`v1/clinic/doctors/${doctorId}/compensation/`, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(payload),
 *   })
 *
 * Always a new entry: the server keeps every earlier one, so settled months keep their terms.
 */
async function setCompensation({ doctorId, payload }: SetCompensationInput): Promise<Compensation> {
  const raw: unknown = await mockExpenseServer.setCompensation(doctorId, payload)
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
