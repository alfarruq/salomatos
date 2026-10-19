import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  type CalendarMonth,
  type Expense,
  expenseKeys,
  expenseSchema,
  mockExpenseServer,
  type PayDuePayload,
  toExpense,
} from '@/entities/expense'

export interface PayDueInput {
  recurringId: number
  payload: PayDuePayload
  /** Same for every retry of one payment, so the server can drop a double submit. */
  idempotencyKey: string
}

/**
 * ⚠️ Mock until `POST /api/v1/clinic/recurring-expenses/{id}/pay/` exists. The real call:
 *
 *   const raw = await httpClient<unknown>(`v1/clinic/recurring-expenses/${recurringId}/pay/`, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
 *     body: JSON.stringify(payload),
 *   })
 *
 * The server answers with the expense it posted; the month links to it.
 */
async function payDue({ recurringId, payload }: PayDueInput): Promise<Expense> {
  const raw: unknown = await mockExpenseServer.pay(recurringId, payload)
  return toExpense(v.parse(expenseSchema, raw))
}

export interface SkipDueInput {
  recurringId: number
  month: CalendarMonth
}

/**
 * ⚠️ Mock until `POST /api/v1/clinic/recurring-expenses/{id}/skip/` exists. The real call:
 *
 *   await httpClient(`v1/clinic/recurring-expenses/${recurringId}/skip/`, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ month }),
 *   })
 */
async function skipDue({ recurringId, month }: SkipDueInput): Promise<void> {
  await mockExpenseServer.skip(recurringId, month)
}

/** ⛔ No optimistic update: money (§10). Nothing is ever marked paid without this call. */
export function usePayDue(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: payDue,
    onSuccess: () => {
      // A new expense: the journal, the summary and the month all change.
      void queryClient.invalidateQueries({ queryKey: expenseKeys.scope(clinicId) })
    },
  })
}

export function useSkipDue(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: skipDue,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: expenseKeys.scope(clinicId) })
    },
  })
}
