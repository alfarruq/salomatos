import * as v from 'valibot'
import { toWorkingHoursPayload } from './schema'
import { WEEKDAYS, type WorkingHours } from './types'

/**
 * The writable shape of a clinic — what `ClinicCreateUpdateSerializer`
 * accepts, minus `admin` (the server sets it, the same way it does for
 * doctors and services) and `logo` (an `ImageField`; this form is JSON-only,
 * and a logo upload needs multipart — out of scope here, matching `image` on
 * the doctor and session records, which are read-only for the same reason).
 */

/** The national format, matching what `PhoneInput` emits. */
const UZ_PHONE = /^\+998\d{9}$/

const dayScheduleFormSchema = v.object({
  isOpen: v.boolean(),
  /** `HH:mm` from a native `<input type="time">`; format is the browser's job. */
  open: v.string(),
  close: v.string(),
})

const hoursSchema = v.object(
  Object.fromEntries(WEEKDAYS.map((day) => [day, dayScheduleFormSchema])) as Record<
    (typeof WEEKDAYS)[number],
    typeof dayScheduleFormSchema
  >,
)

export const clinicFormSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(2, 'validation.tooShort')),
  phoneNumber: v.pipe(v.string(), v.regex(UZ_PHONE, 'validation.phoneUz')),
  address: v.pipe(v.string(), v.trim(), v.minLength(2, 'validation.tooShort')),
  hours: hoursSchema,
})

export type ClinicFormInput = v.InferOutput<typeof clinicFormSchema>

/** 09:00–18:00, closed on Sunday — a plausible default, not a server one. */
export const emptyClinicForm: ClinicFormInput = {
  name: '',
  phoneNumber: '',
  address: '',
  hours: Object.fromEntries(
    WEEKDAYS.map((day) => [day, { isOpen: day !== 'sun', open: '09:00', close: '18:00' }]),
  ) as ClinicFormInput['hours'],
}

export function toClinicPayload(input: ClinicFormInput): Record<string, unknown> {
  const hours: WorkingHours = {}
  for (const day of WEEKDAYS) {
    const entry = input.hours[day]
    hours[day] = entry.isOpen ? { open: entry.open, close: entry.close } : null
  }

  return {
    name: input.name,
    phone_number: input.phoneNumber,
    address: input.address,
    working_hours: toWorkingHoursPayload(hours),
  }
}

const SERVER_FIELD_NAMES: Record<string, keyof ClinicFormInput> = {
  name: 'name',
  phone_number: 'phoneNumber',
  address: 'address',
}

/** The inverse, for putting a server error back on the input that caused it (§10). */
export function clinicFormFieldOf(serverField: string): keyof ClinicFormInput | 'root' {
  return SERVER_FIELD_NAMES[serverField] ?? 'root'
}
