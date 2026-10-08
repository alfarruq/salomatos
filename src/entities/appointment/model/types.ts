import type { CalendarDate } from '@/shared/lib/calendarDate'

/** Integer, not a UUID — ADR-013. */
export type AppointmentId = number

/**
 * `Treatment.Status` and `Patient`'s own status already share this pair
 * (`entities/patient/model/types.ts`) — confirmed to be the same two values
 * here rather than a separate enum.
 */
export type AppointmentStatus = 'in_progress' | 'completed'

/**
 * A scheduled visit.
 *
 * `patientId` is null for a walk-in who is not yet a registered patient —
 * `fullName`/`phoneNumber` are the source of truth for the visit either way
 * (the backend accepts both alongside `patient` on write), and are filled
 * in from the linked patient only as a convenience when one is picked.
 *
 * Confirmed against a real response: unlike `doctor_type` elsewhere, this
 * endpoint sends both the id (`patient_id`/`doctor_id`) and the name
 * (`patient`/`doctor`) directly, so no id-from-name guessing is needed here.
 * `fullName` is read from `patient` — there is no separate `full_name` field
 * on read, only on write — see `model/schema.ts` for the walk-in caveat.
 */
export interface Appointment {
  id: AppointmentId
  fullName: string
  phoneNumber: string | null
  patientId: number | null
  doctorId: number | null
  doctorName: string | null
  /**
   * A name, same shape as `doctorName` — but only ever seen `null` so far,
   * so the id-vs-name split is unconfirmed for this one. Not part of the
   * writable form yet (§ schema.ts).
   */
  treatmentTypeName: string | null
  date: CalendarDate
  /** `HH:mm`. A wall-clock pair like `AppointmentSlot` — see that type for why. */
  time: string
  notes: string | null
  status: AppointmentStatus
}

/**
 * Which slice of the calendar the list endpoint answers for. `all` sends no
 * `date` query parameter at all — confirmed with the person requesting it,
 * not guessed — rather than a literal `?date=all` shortcut.
 */
export type AppointmentView = 'day' | 'week' | 'all'

export interface AppointmentFilters {
  view: AppointmentView
  /**
   * The day being viewed (day view) or a day inside the viewed week (week
   * view); unused for `all`. Not sent as `?date=week` at all once it has a
   * real value — see `api/queries.ts` for why day navigation needs an actual
   * date and the server's own `day`/`week` shortcuts do not carry one.
   */
  date: CalendarDate
}
