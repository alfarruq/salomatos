import * as v from 'valibot'
import type { TreatmentType } from './types'

/**
 * The writable shape of a service — what `TreatmentTypeCreateUpdateSerializer`
 * accepts: `name` and `price`, nothing else. The clinic is set by the server.
 *
 * In the entity rather than a feature, so create and edit share one definition
 * without importing each other (§4).
 */

/** Digits only. Money is entered as whole so'm — no separators, no decimals. */
const DIGITS = /^\d+$/

export const treatmentTypeFormSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(2, 'validation.tooShort')),
  /*
   * A string in the form and a number on the wire.
   *
   * Kept as text because that is what an input holds, and because an empty
   * price is a real state — plenty of work is quoted per case rather than
   * listed. `PositiveIntegerField` is what rejects a negative one, and the
   * digits-only rule is what stops "1 200 000" being sent as a broken number.
   */
  price: v.pipe(
    v.string(),
    v.trim(),
    v.check((value) => value === '' || DIGITS.test(value), 'validation.invalid'),
  ),
})

export type TreatmentTypeFormInput = v.InferOutput<typeof treatmentTypeFormSchema>

export const emptyTreatmentTypeForm: TreatmentTypeFormInput = { name: '', price: '' }

export function toTreatmentTypeForm(service: TreatmentType): TreatmentTypeFormInput {
  return { name: service.name, price: service.price === null ? '' : String(service.price) }
}

export function toTreatmentTypePayload(
  input: TreatmentTypeFormInput,
): Record<string, string | number | null> {
  return {
    name: input.name,
    // Null, not 0: "no price set" and "free" are different things to a clinic.
    price: input.price === '' ? null : Number(input.price),
  }
}

const SERVER_FIELD_NAMES: Record<string, keyof TreatmentTypeFormInput> = {
  name: 'name',
  price: 'price',
}

/** The inverse, for putting a server error back on the input that caused it (§10). */
export function treatmentTypeFormFieldOf(
  serverField: string,
): keyof TreatmentTypeFormInput | 'root' {
  return SERVER_FIELD_NAMES[serverField] ?? 'root'
}
