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

export interface PayDoctorShareInput {
  /** Always `doctor_share` with the doctor set; the dialog builds it. */
  payload: ExpensePayload
  /** Same for every retry of one payout, so the server can drop a double submit. */
  idempotencyKey: string
  /** Only the mock needs it; the server joins the name from the id. */
  doctorName: string
}

/**
 * A payout is an ordinary expense in the "doctor share" category: the same
 * `POST /api/v1/clinic/expenses/` as the journal, so there is one record of
 * money out. ⚠️ Mock until that endpoint exists; see `features/expense-create`.
 */
async function payDoctorShare({ payload, doctorName }: PayDoctorShareInput): Promise<Expense> {
  const raw: unknown = await mockExpenseServer.create(payload, doctorName)
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
