import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  expenseKeys,
  type RecurringExpense,
  type RecurringPayload,
  recurringExpenseSchema,
  toRecurringExpense,
} from '@/entities/expense'
import { httpClient } from '@/shared/api/httpClient'

async function createRecurring(payload: RecurringPayload): Promise<RecurringExpense> {
  const raw = await httpClient<unknown>('v1/finance/recurring-expenses/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return toRecurringExpense(v.parse(recurringExpenseSchema, raw))
}

export interface UpdateRecurringInput {
  id: number
  payload: Partial<RecurringPayload> & { is_active?: boolean }
}

/** A template is paused, never deleted: past months still point at it. */
async function updateRecurring({ id, payload }: UpdateRecurringInput): Promise<RecurringExpense> {
  const raw = await httpClient<unknown>(`v1/finance/recurring-expenses/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
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
