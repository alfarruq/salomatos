import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  type Expense,
  type ExpensePayload,
  expenseKeys,
  expenseSchema,
  mockExpenseServer,
  toExpense,
} from '@/entities/expense'

export interface UpdateExpenseInput {
  id: number
  payload: ExpensePayload
  /** Only the mock needs it; the server joins the name from the id. */
  doctorName: string | null
}

/**
 * ⚠️ Mock until `PATCH /api/v1/clinic/expenses/{id}/` exists. The real call:
 *
 *   const raw = await httpClient<unknown>(`v1/clinic/expenses/${id}/`, {
 *     method: 'PATCH',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(payload),
 *   })
 *
 * The server keeps the edit history; this client only sends the new values.
 */
async function updateExpense({ id, payload, doctorName }: UpdateExpenseInput): Promise<Expense> {
  const raw: unknown = await mockExpenseServer.update(id, payload, doctorName)
  return toExpense(v.parse(expenseSchema, raw))
}

/** ⛔ No optimistic update: money (§10). */
export function useUpdateExpense(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateExpense,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.scope(clinicId) })
    },
  })
}
