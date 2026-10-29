import * as v from 'valibot'
import { parseCalendarDate } from '@/shared/lib/calendarDate'
import { clinicNow } from '@/shared/lib/datetime'

const DIGITS = /^\d+$/
const NOTE_MAX = 500

/**
 * One payment toward one treatment. The bounds depend on the treatment, so
 * the schema is built per dialog: never more than is still owed, never dated
 * before the work started. The server checks both again.
 */
export function paymentFormSchema(debt: number, startDate: string | null) {
  return v.object({
    date: v.pipe(
      v.string(),
      v.minLength(1, 'validation.required'),
      v.check((value) => parseCalendarDate(value) !== null, 'validation.invalid'),
      // The clinic's day, not the browser's (§14).
      v.check((value) => value <= clinicNow().date, 'validation.futureDate'),
      v.check(
        (value) => startDate === null || value >= startDate,
        'validation.before_treatment_start',
      ),
    ),
    amount: v.pipe(
      v.string(),
      v.trim(),
      v.minLength(1, 'validation.required'),
      v.check((value) => DIGITS.test(value) && Number(value) > 0, 'validation.invalid'),
      v.check((value) => Number(value) <= debt, 'validation.exceeds_debt'),
    ),
    note: v.pipe(v.string(), v.trim(), v.maxLength(NOTE_MAX, 'validation.max_length')),
  })
}

export type PaymentFormInput = v.InferOutput<ReturnType<typeof paymentFormSchema>>

export interface PaymentPayload {
  treatment: number
  amount: number
  date: string
  note: string | null
}

export function toPaymentPayload(treatmentId: number, input: PaymentFormInput): PaymentPayload {
  return {
    treatment: treatmentId,
    amount: Number(input.amount),
    date: input.date,
    note: input.note === '' ? null : input.note,
  }
}

const SERVER_FIELDS: Record<string, keyof PaymentFormInput> = {
  date: 'date',
  amount: 'amount',
  note: 'note',
}

export function paymentFormFieldOf(serverField: string): keyof PaymentFormInput | 'root' {
  return SERVER_FIELDS[serverField] ?? 'root'
}
