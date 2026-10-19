import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  expenseKeys,
  mockExpenseServer,
  type RecurringExpense,
  type RecurringPayload,
  recurringExpenseSchema,
  toRecurringExpense,
} from '@/entities/expense'

/**
 * ⚠️ Mock until `POST /api/v1/clinic/recurring-expenses/` exists. The real call:
 *
 *   const raw = await httpClient<unknown>('v1/clinic/recurring-expenses/', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(payload),
 *   })
 */
async function createRecurring(payload: RecurringPayload): Promise<RecurringExpense> {
  const raw: unknown = await mockExpenseServer.createRecurring(payload)
  return toRecurringExpense(v.parse(recurringExpenseSchema, raw))
}

export interface UpdateRecurringInput {
  id: number
  payload: Partial<RecurringPayload> & { is_active?: boolean }
}

/**
 * ⚠️ Mock until `PATCH /api/v1/clinic/recurring-expenses/{id}/` exists. The real call:
 *
 *   const raw = await httpClient<unknown>(`v1/clinic/recurring-expenses/${id}/`, {
 *     method: 'PATCH',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(payload),
 *   })
 *
 * A template is paused, never deleted: past months still point at it.
 */
async function updateRecurring({ id, payload }: UpdateRecurringInput): Promise<RecurringExpense> {
  const raw: unknown = await mockExpenseServer.updateRecurring(id, payload)
  return toRecurringExpense(v.parse(recurringExpenseSchema, raw))
}

export function useCreateRecurring(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRecurring,
    onSuccess: () => {
      // The template list and every month's due list change.
      void queryClient.invalidateQueries({ queryKey: expenseKeys.scope(clinicId) })
    },
  })
}

/** ⛔ No optimistic update: the due list's sums come from the server (§10). */
export function useUpdateRecurring(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateRecurring,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.scope(clinicId) })
    },
  })
}
