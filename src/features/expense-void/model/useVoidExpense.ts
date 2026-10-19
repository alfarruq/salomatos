import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  type Expense,
  expenseKeys,
  expenseSchema,
  mockExpenseServer,
  toExpense,
} from '@/entities/expense'

export interface VoidExpenseInput {
  id: number
  reason: string
}

/**
 * ⚠️ Mock until `POST /api/v1/clinic/expenses/{id}/void/` exists. The real call:
 *
 *   const raw = await httpClient<unknown>(`v1/clinic/expenses/${id}/void/`, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ reason }),
 *   })
 *
 * Voiding, not `DELETE`: a money record never disappears without a trace.
 */
async function voidExpense({ id, reason }: VoidExpenseInput): Promise<Expense> {
  const raw: unknown = await mockExpenseServer.void(id, reason)
  return toExpense(v.parse(expenseSchema, raw))
}

/** ⛔ No optimistic update: money (§10). */
export function useVoidExpense(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: voidExpense,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.scope(clinicId) })
    },
  })
}
