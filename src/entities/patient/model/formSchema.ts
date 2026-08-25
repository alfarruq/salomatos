import * as v from 'valibot'
import { parseCalendarDate } from '@/shared/lib/calendarDate'
import type { Patient } from './types'

/**
 * The writable shape of a patient — what `PatientCreateUpdateSerializer`
 * accepts.
 *
 * **Why this lives in the entity rather than in a feature.** `patient-create`
 * and `patient-edit` are two slices in the same layer, and §4 forbids one from
 * importing the other; they compose only at the widget level. Both send the
 * same fields to the same serializer, so the choice is between duplicating the
 * schema and the field markup in two places, or keeping the *definition of
 * what a patient is* with the entity and letting each feature own only its
 * mutation. The second keeps one source of truth for the contract.
 *
 * ⛔ `doctor` is absent, though the serializer accepts it. Assigning a doctor
 * needs a doctor picker, which needs `entities/doctor`, which does not exist
 * until phase 7.5. The field is nullable on the model, so omitting it creates a
 * patient with no doctor assigned — the same state the backend produces when a
 * receptionist has not chosen one yet.
 */

/**
 * The national format, matching what `PhoneInput` emits.
 *
 * Deliberately stricter than the server's `^\+?[1-9]\d{6,14}$`, which would
 * accept a seven-digit number from anywhere. Every patient of a Tashkent
 * dental clinic has an Uzbek number, and catching a typo here is better than a
 * 400 later.
 */
const UZ_PHONE = /^\+998\d{9}$/

/**
 * Form values are all strings — that is what inputs hold, and an empty string
 * is what an untouched optional field looks like. The mapping to the wire's
 * nulls happens in `toPatientPayload`, at the boundary, once.
 */
export const patientFormSchema = v.object({
  fullName: v.pipe(v.string(), v.trim(), v.minLength(2, 'validation.tooShort')),
  phoneNumber: v.pipe(v.string(), v.regex(UZ_PHONE, 'validation.phoneUz')),
  birthDate: v.pipe(
    v.string(),
    // Optional, but not a licence to send nonsense: `parseCalendarDate`
    // rejects 2026-02-31, which JavaScript would otherwise turn into 3 March.
    v.check((value) => value === '' || parseCalendarDate(value) !== null, 'validation.invalid'),
  ),
  address: v.string(),
  office: v.string(),
})

export type PatientFormInput = v.InferOutput<typeof patientFormSchema>

export const emptyPatientForm: PatientFormInput = {
  fullName: '',
  phoneNumber: '',
  birthDate: '',
  address: '',
  office: '',
}

/** Fills the form from an existing patient, for editing. */
export function toPatientForm(patient: Patient): PatientFormInput {
  return {
    fullName: patient.fullName,
    phoneNumber: patient.phoneNumber ?? '',
    birthDate: patient.birthDate ?? '',
    address: patient.address ?? '',
    office: patient.office ?? '',
  }
}

/** Maps to the snake_case body the serializer reads. Empty means null, not "". */
export function toPatientPayload(input: PatientFormInput): Record<string, string | null> {
  const orNull = (value: string): string | null => (value === '' ? null : value)

  return {
    full_name: input.fullName,
    phone_number: input.phoneNumber,
    birth_date: orNull(input.birthDate),
    address: orNull(input.address),
    office: orNull(input.office),
  }
}

const SERVER_FIELD_NAMES: Record<string, keyof PatientFormInput> = {
  full_name: 'fullName',
  phone_number: 'phoneNumber',
  birth_date: 'birthDate',
  address: 'address',
  office: 'office',
}

/**
 * The inverse of `toPatientPayload`, for putting a server error back on the
 * input that caused it (§10).
 *
 * Anything unrecognised becomes `root`, so a rejection naming a field this form
 * does not render — `doctor`, which the serializer accepts but the form omits —
 * is still shown rather than silently dropped.
 */
export function patientFormFieldOf(serverField: string): keyof PatientFormInput | 'root' {
  return SERVER_FIELD_NAMES[serverField] ?? 'root'
}
