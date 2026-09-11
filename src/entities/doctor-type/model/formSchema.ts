import * as v from 'valibot'
import type { DoctorType } from './types'

/**
 * The writable shape of a doctor type — what
 * `DoctorTypeCreateUpdateSerializer` accepts: `name`, and nothing else. The
 * clinic is set by the server (`create_doctor_type`), the same way it is for
 * doctors and services.
 *
 * ⚠️ The server's own field is `required=False` with a default of
 * `'Stomatolog'` — posting `{}` succeeds. That default is a safety net against
 * a malformed request, not something this form should rely on: a name typed
 * by nobody and silently turned into a diagnosis nobody chose is a worse
 * outcome than an inline "required" message. The client requires it.
 */
export const doctorTypeFormSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(2, 'validation.tooShort')),
})

export type DoctorTypeFormInput = v.InferOutput<typeof doctorTypeFormSchema>

export const emptyDoctorTypeForm: DoctorTypeFormInput = { name: '' }

export function toDoctorTypeForm(doctorType: DoctorType): DoctorTypeFormInput {
  return { name: doctorType.name }
}

export function toDoctorTypePayload(input: DoctorTypeFormInput): Record<string, string> {
  return { name: input.name }
}

const SERVER_FIELD_NAMES: Record<string, keyof DoctorTypeFormInput> = {
  name: 'name',
}

/** The inverse, for putting a server error back on the input that caused it (§10). */
export function doctorTypeFormFieldOf(serverField: string): keyof DoctorTypeFormInput | 'root' {
  return SERVER_FIELD_NAMES[serverField] ?? 'root'
}
