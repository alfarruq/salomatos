import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  type Expense,
  type ExpensePayload,
  expenseKeys,
  expenseSchema,
  toExpense,
} from '@/entities/expense'
import { httpClient } from '@/shared/api/httpClient'

export interface PayDoctorShareInput {
  /** Always `doctor_share` with the doctor set; the dialog builds it. */
  payload: ExpensePayload
  /** Same for every retry of one payout, so the server can drop a double submit. */
  idempotencyKey: string
}

/**
 * A payout is an ordinary expense in the "doctor share" category: the same
 * `POST /api/v1/finance/expenses/` as the journal, so there is one record of
 * money out.
 */
async function payDoctorShare({ payload, idempotencyKey }: PayDoctorShareInput): Promise<Expense> {
  const raw = await httpClient<unknown>('v1/finance/expenses/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  })
  return toExpense(v.parse(expenseSchema, raw))
}

/** ⛔ No optimistic update: money (§10). */
export function usePayDoctorShare(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: payDoctorShare,
    onSuccess: () => {
      // The payroll, the journal and the sums all change.
      void queryClient.invalidateQueries({ queryKey: expenseKeys.scope(clinicId) })
    },
  })
}
