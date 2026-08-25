import type { CalendarDate } from '@/shared/lib/calendarDate'

/** Integer, not a UUID — ADR-013. */
export type PatientId = number

/**
 * `Treatment.Status` and `Appointment.Status` on the backend. The same two
 * values, declared separately on each model.
 */
export type PatientStatus = 'in_progress' | 'completed'

/**
 * A wall-clock appointment slot, as the patient list reports it.
 *
 * Not an instant, and deliberately not a `Date`. `Appointment` stores `date`
 * and `time` as separate naive columns, so there is no zone to convert from —
 * these are the clinic's own wall clock (§12.4 is about *instants*, which
 * these are not). Keeping them as parts means nothing can silently shift them
 * by an hour.
 */
export interface AppointmentSlot {
  date: CalendarDate
  /** `HH:mm`, 24-hour. */
  time: string
}

/**
 * A row in the patient list.
 *
 * Deliberately not the same type as `Patient`: `PatientListSerializer` and
 * `PatientDetailSerializer` are different shapes, and pretending otherwise
 * would mean a screen reading a field the list never sent.
 */
export interface PatientListItem {
  id: PatientId
  fullName: string
  phoneNumber: string | null
  birthDate: CalendarDate | null
  address: string | null
  office: string | null
  /**
   * The doctor's name, with no id beside it — the serializer renders the
   * foreign key through `__str__`. Nothing can link to the doctor from here
   * until the backend sends one.
   */
  doctorName: string | null
  /** From the patient's most recent *treatment*. */
  status: PatientStatus | null
  treatmentType: string | null
  lastAppointment: AppointmentSlot | null
  /**
   * Money, in so'm, as whole numbers.
   *
   * §7.3 forbids floats in financial arithmetic and the backend agrees by
   * accident: these are `PositiveIntegerField`. Two consequences worth
   * knowing — nothing can be negative, so a refund has no representation, and
   * the column caps at about 2.1 billion so'm.
   */
  remaining: number | null
  totalRemaining: number
}

/** The patient card. */
export interface Patient {
  id: PatientId
  fullName: string
  phoneNumber: string | null
  birthDate: CalendarDate | null
  address: string | null
  office: string | null
  doctorName: string | null
  imageUrl: string | null
  /**
   * The server's own arithmetic, kept rather than recomputed.
   *
   * ⚠️ It is `now.year - birth_date.year`, which is wrong for anyone whose
   * birthday has not yet passed this year — off by one for most of the
   * calendar. Recomputing it here would be easy and would also mean the card
   * and every other consumer of the API disagree. Fixing it belongs on the
   * server.
   */
  age: number | null
  /** From the patient's most recent *appointment* — not the same source as the list's. */
  status: PatientStatus | null
  treatments: readonly PatientTreatment[]
  totalTreatmentCost: number
  totalPaid: number
  remaining: number
  totalRemaining: number
  visitNumber: number
}

export interface PatientTreatment {
  id: number
  name: string
  /** FDI tooth number. One tooth per treatment row on this backend. */
  toothNumber: number | null
}

/**
 * What the list endpoint accepts.
 *
 * ⛔ `search` is PHI and must never reach the browser's URL (§3): it goes into
 * `useState` behind a debounce, not into search params. It is in this object
 * because it belongs in the *query key* — the cache has to tell two searches
 * apart — and because the request needs it.
 *
 * ⚠️ It still reaches the server as `?search=`, which is the only form the
 * backend offers, so nginx must be configured not to log query strings before
 * this ships. That is a deployment task, not something the client can fix.
 */
export interface PatientFilters {
  search: string
  status: PatientStatus | null
  /** Doctor name substring. A staff name, not patient data. */
  doctor: string
  treatmentTypeId: number | null
  page: number
}

export const defaultPatientFilters: PatientFilters = {
  search: '',
  status: null,
  doctor: '',
  treatmentTypeId: null,
  page: 1,
}
