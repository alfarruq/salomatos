import type { CalendarDate } from '@/shared/lib/calendarDate'

/**
 * `Treatment.Status` on the backend — the same two values as
 * `entities/patient`'s `PatientStatus`, declared again rather than imported:
 * entities may not see one another (§4), and the model itself repeats this
 * choice field on two tables.
 */
export type TreatmentStatus = 'in_progress' | 'completed'

/**
 * One performed or booked treatment, from `/clinic/treatments/`.
 *
 * Not the same shape as `entities/patient`'s `PatientTreatment` — that is the
 * short tooth-chart summary embedded in the patient detail response; this is
 * the full record, with cost, dates and clinical notes.
 */
export interface Treatment {
  id: number
  doctorName: string | null
  treatmentTypeName: string | null
  totalTreatmentCost: number | null
  totalPaid: number | null
  remaining: number | null
  visitNumber: number | null
  /** FDI tooth number. */
  toothNumber: number | null
  startDate: CalendarDate | null
  notes: string | null
  status: TreatmentStatus | null
}
