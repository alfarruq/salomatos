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

export interface CreateExpenseInput {
  payload: ExpensePayload
  /** Same for every retry of one entry, so the server can drop a double submit. */
  idempotencyKey: string
  /** Only the mock needs it; the server joins the name from the id. */
  doctorName: string | null
}

/**
 * ⚠️ Mock until `POST /api/v1/clinic/expenses/` exists. The real call:
 *
 *   const raw = await httpClient<unknown>('v1/clinic/expenses/', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
 *     body: JSON.stringify(payload),
 *   })
 */
async function createExpense({ payload, doctorName }: CreateExpenseInput): Promise<Expense> {
  const raw: unknown = await mockExpenseServer.create(payload, doctorName)
  return toExpense(v.parse(expenseSchema, raw))
}

/** ⛔ No optimistic update: money, and the server assigns the id (§10). */
export function useCreateExpense(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      // The journal and the sums both change.
      void queryClient.invalidateQueries({ queryKey: expenseKeys.scope(clinicId) })
    },
  })
}
