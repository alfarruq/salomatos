import * as v from 'valibot'
import type { Doctor } from './types'

/**
 * The wire contract for `/clinic/doctors/`, validated at runtime (ADR-006).
 *
 * ⚠️ The list endpoint returns a **plain array**, not a page. The published
 * schema says otherwise — it shows a single `DoctorList` object, because
 * `swagger_auto_schema` was given the serializer without `many=True` — and the
 * Python is the one telling the truth here (`get_response(..., many=True)`).
 * Patients paginate; doctors and services do not.
 */

/** Absent or null both mean "nothing here" — see `sessionSchema` for why. */
const optionalString = v.optional(v.nullable(v.string()), null)

export const doctorSchema = v.object({
  // The two a row cannot exist without. Everything else may be missing.
  id: v.pipe(v.number(), v.integer()),
  full_name: v.string(),

  specialty: optionalString,
  phone_number: optionalString,
  email: optionalString,
})

export const doctorListSchema = v.array(doctorSchema)

export type DoctorResponse = v.InferOutput<typeof doctorSchema>

export function toDoctor(response: DoctorResponse): Doctor {
  return {
    id: response.id,
    fullName: response.full_name,
    specialty: response.specialty,
    phoneNumber: response.phone_number,
    email: response.email,
  }
}
