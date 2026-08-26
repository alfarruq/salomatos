import * as v from 'valibot'
import type { Doctor } from './types'

/**
 * The writable shape of a doctor — what `DoctorCreateUpdateSerializer` accepts.
 *
 * Lives in the entity for the same reason the patient one does: `doctor-create`
 * and `doctor-edit` are two slices in the same layer and §4 forbids one from
 * importing the other, so the definition of what a doctor *is* stays here and
 * each feature owns only its mutation.
 *
 * `role` and `clinic` are absent because the server sets them itself
 * (`create_doctor`), which is the right place for them: a client that could
 * name the clinic could name someone else's.
 */

/** The national format, matching what `PhoneInput` emits. */
const UZ_PHONE = /^\+998\d{9}$/

export const doctorFormSchema = v.object({
  fullName: v.pipe(v.string(), v.trim(), v.minLength(2, 'validation.tooShort')),
  phoneNumber: v.pipe(v.string(), v.regex(UZ_PHONE, 'validation.phoneUz')),
  specialty: v.string(),
  /*
   * Optional, but a wrong address is worse than none: it is where the clinic
   * would send anything that matters. Empty passes; anything else must parse.
   */
  email: v.pipe(
    v.string(),
    v.check(
      (value) => value === '' || v.is(v.pipe(v.string(), v.email()), value),
      'validation.email',
    ),
  ),
})

export type DoctorFormInput = v.InferOutput<typeof doctorFormSchema>

export const emptyDoctorForm: DoctorFormInput = {
  fullName: '',
  phoneNumber: '',
  specialty: '',
  email: '',
}

export function toDoctorForm(doctor: Doctor): DoctorFormInput {
  return {
    fullName: doctor.fullName,
    phoneNumber: doctor.phoneNumber ?? '',
    specialty: doctor.specialty ?? '',
    email: doctor.email ?? '',
  }
}

/** Maps to the snake_case body the serializer reads. Empty means null, not "". */
export function toDoctorPayload(input: DoctorFormInput): Record<string, string | null> {
  const orNull = (value: string): string | null => (value === '' ? null : value)

  return {
    full_name: input.fullName,
    phone_number: input.phoneNumber,
    specialty: orNull(input.specialty),
    email: orNull(input.email),
  }
}

const SERVER_FIELD_NAMES: Record<string, keyof DoctorFormInput> = {
  full_name: 'fullName',
  phone_number: 'phoneNumber',
  specialty: 'specialty',
  email: 'email',
}

/** The inverse, for putting a server error back on the input that caused it (§10). */
export function doctorFormFieldOf(serverField: string): keyof DoctorFormInput | 'root' {
  return SERVER_FIELD_NAMES[serverField] ?? 'root'
}
