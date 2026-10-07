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
  /**
   * An `entities/doctor-type` id as a string, not the type's name that
   * `TreatmentType.doctorTypeName` carries — see `doctor/model/formSchema.ts`,
   * whose `doctorTypeId` this mirrors exactly, including why `toTreatmentTypeForm`
   * below cannot fill it in. `''` means unassigned.
   */
  doctorTypeId: v.string(),
})

export type TreatmentTypeFormInput = v.InferOutput<typeof treatmentTypeFormSchema>

export const emptyTreatmentTypeForm: TreatmentTypeFormInput = {
  name: '',
  price: '',
  doctorTypeId: '',
}

export function toTreatmentTypeForm(service: TreatmentType): TreatmentTypeFormInput {
  return {
    name: service.name,
    price: service.price === null ? '' : String(service.price),
    // Cannot be filled in: `service.doctorTypeName` is a name, not the id this
    // field needs, and nothing in the read response carries the id — same
    // situation and same reason as `doctor/model/formSchema.ts#toDoctorForm`.
    // The edit dialog only saves this when the person actually used the select
    // (`formState.dirtyFields.doctorTypeId`), so opening blank does not erase
    // whatever is really assigned.
    doctorTypeId: '',
  }
}

export function toTreatmentTypePayload(
  input: TreatmentTypeFormInput,
): Record<string, string | number | null> {
  return {
    name: input.name,
    // Null, not 0: "no price set" and "free" are different things to a clinic.
    price: input.price === '' ? null : Number(input.price),
    doctor_type: input.doctorTypeId === '' ? null : Number(input.doctorTypeId),
  }
}

const SERVER_FIELD_NAMES: Record<string, keyof TreatmentTypeFormInput> = {
  name: 'name',
  price: 'price',
  doctor_type: 'doctorTypeId',
}

/** The inverse, for putting a server error back on the input that caused it (§10). */
export function treatmentTypeFormFieldOf(
  serverField: string,
): keyof TreatmentTypeFormInput | 'root' {
  return SERVER_FIELD_NAMES[serverField] ?? 'root'
}
