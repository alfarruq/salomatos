import * as v from 'valibot'
import type { Appointment, AppointmentStatus } from './types'

/**
 * The wire contract for `/calendars/appointments/` (ADR-006).
 *
 * Confirmed against a real response, which does not match what the POST
 * body's own field names implied: there is no `full_name` on read. The
 * server puts the display name under `patient` instead — for a linked
 * patient it is their record's *own* name, confirmed by a PATCH that sent a
 * changed `full_name` and got the original patient's name back unchanged.
 * A walk-in's typed name is assumed to come back the same way (unconfirmed —
 * no walk-in response seen yet) — alongside the real id, separately, in
 * `patient_id`. `doctor`/`doctor_id` follow the same pair. `treatment_type`/
 * `tooth_number` also come back but are not part of this form yet, so they
 * are left out of the schema.
 */

/** Absent or null both mean "nothing here"; anything else that is not a plain string degrades to `null` rather than throwing (one bad field must not blank the whole calendar). */
const optionalString = v.optional(
  v.pipe(
    v.unknown(),
    v.transform((value): string | null => (typeof value === 'string' ? value : null)),
  ),
  null,
)

/** Same defensive stance as `optionalString`, for the `*_id` fields. */
const optionalId = v.optional(
  v.pipe(
    v.unknown(),
    v.transform((value): number | null => {
      if (typeof value === 'number' && Number.isInteger(value)) return value
      if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
      return null
    }),
  ),
  null,
)

const STATUSES: readonly AppointmentStatus[] = ['in_progress', 'completed']

/**
 * Falls back to `in_progress` for anything unrecognised rather than throwing
 * — confirmed to be a two-value enum today, but a third value the backend
 * adds later (`cancelled`, `no_show`, ...) must not take the whole calendar
 * down before this schema is updated for it.
 */
const statusSchema = v.pipe(
  v.optional(v.unknown(), 'in_progress'),
  v.transform(
    (value): AppointmentStatus =>
      STATUSES.includes(value as AppointmentStatus) ? (value as AppointmentStatus) : 'in_progress',
  ),
)

export const appointmentSchema = v.object({
  id: v.pipe(v.number(), v.integer()),
  patient_id: optionalId,
  patient: optionalString,
  phone_number: optionalString,
  doctor_id: optionalId,
  doctor: optionalString,
  // Only ever seen `null` in a real response — a name is the working
  // assumption (same as `doctor`), not confirmed.
  treatment_type: optionalString,
  date: v.string(),
  time: v.string(),
  notes: optionalString,
  status: statusSchema,
})

export const appointmentListSchema = v.array(appointmentSchema)

export type AppointmentResponse = v.InferOutput<typeof appointmentSchema>

/**
 * `HH:mm:ss` on read (DRF's default `TimeField` rendering) trimmed to the
 * `HH:mm` used everywhere else — the native time input cannot display a
 * value with seconds unless it opts into that precision itself.
 */
function toHourMinute(value: string): string {
  return value.slice(0, 5)
}

export function toAppointment(response: AppointmentResponse): Appointment {
  return {
    id: response.id,
    fullName: response.patient ?? '',
    phoneNumber: response.phone_number,
    patientId: response.patient_id,
    doctorId: response.doctor_id,
    doctorName: response.doctor,
    treatmentTypeName: response.treatment_type,
    date: response.date,
    time: toHourMinute(response.time),
    notes: response.notes,
    status: response.status,
  }
}
