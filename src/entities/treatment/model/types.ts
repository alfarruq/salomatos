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
/**
 * The clinic-wide list's filters — all four confirmed live on 2026-10-14,
 * and combinable. Ids only: a patient's name never goes in a URL (§3).
 */
export interface TreatmentListFilters {
  page: number
  patientId: number | null
  doctorId: number | null
  treatmentTypeId: number | null
  /** `with` → `remaining=true`, `without` → `remaining=false`, null → both. */
  debt: 'with' | 'without' | null
}

export const defaultTreatmentListFilters: TreatmentListFilters = {
  page: 1,
  patientId: null,
  doctorId: null,
  treatmentTypeId: null,
  debt: null,
}

export interface Treatment {
  id: number
  /** Sent beside the name on the list endpoint — the clinic-wide table links by it. */
  patientId: number | null
  patientName: string | null
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
