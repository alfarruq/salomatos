import { useMutation, useQueryClient } from '@tanstack/react-query'
import { financeKeys } from '@/entities/finance'
import { patientKeys } from '@/entities/patient'
import { treatmentKeys } from '@/entities/treatment'
import { httpClient } from '@/shared/api/httpClient'
import type { PaymentPayload } from './formSchema'

export interface CreatePaymentInput {
  payload: PaymentPayload
  /** Same for every retry of one payment, so a server that dedupes can drop a double submit. */
  idempotencyKey: string
}

/**
 * Money received for a treatment. The server adds it to the treatment's paid
 * total in the same transaction and refuses more than is owed.
 */
async function createPayment({ payload, idempotencyKey }: CreatePaymentInput): Promise<void> {
  await httpClient('v1/finance/payments/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload),
  })
}

/** ⛔ No optimistic update: money (§10). */
export function useCreatePayment(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      // The debt column, the patient's balance and the clinic's reports all move.
      void queryClient.invalidateQueries({ queryKey: treatmentKeys.scope(clinicId) })
      void queryClient.invalidateQueries({ queryKey: patientKeys.scope(clinicId) })
      void queryClient.invalidateQueries({ queryKey: financeKeys.scope(clinicId) })
    },
  })
}
