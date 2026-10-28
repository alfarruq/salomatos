import { digitsOf } from '@/shared/ui'
import type { ComposerFields, TreatmentRow } from './types'

/**
 * Wire payload for `POST /api/v1/clinic/treatments/` — one tooth per entry,
 * sent as an array even for a single new row (confirmed shape). Every id
 * field (`patient`, `doctor`, `treatment_type`) is the integer the backend
 * expects on write; the read side of the same names carries a display string
 * instead (`entities/treatment`'s schema comment explains why).
 *
 * `visit_number` is required — confirmed live: the same payload without it is
 * a 400, with it a 200. The product decision is the patient's current visit
 * count plus one, not shown in the form; every row in one save is one visit.
 */
export interface NewTreatmentPayload {
  patient: number
  doctor: number
  treatment_type: number
  total_treatment_cost: number
  total_paid: number
  visit_number: number
  /**
   * `null` for a non-dental treatment — sent explicitly, not omitted, per the
   * agreed contract (the backend made `tooth_number` nullable).
   */
  tooth_number: number | null
  start_date: string
  /** The day the row was marked completed; `null` while it is in progress. */
  completed_date: string | null
  notes: string
  status: TreatmentRow['status']
}

/**
 * The day a row is completed by this save, which the statistics count by: the
 * clinic's today, never before the treatment started (the backend refuses
 * that). `null` when this save does not complete it.
 */
function completionDateOf(row: TreatmentRow, today: string, startDate: string): string | null {
  if (row.status !== 'completed' || row.initialStatus === 'completed') return null
  return today < startDate ? startDate : today
}

export function toNewTreatmentPayload(
  row: TreatmentRow,
  fields: ComposerFields,
  context: { patientId: number; startDate: string; visitNumber: number; today: string },
): NewTreatmentPayload | null {
  if (row.treatmentTypeId === null) return null
  // `Number('')` is 0, and an unselected doctor is not doctor zero.
  if (fields.doctorId === '') return null
  const doctorId = Number(fields.doctorId)
  if (!Number.isInteger(doctorId)) return null

  return {
    patient: context.patientId,
    doctor: doctorId,
    treatment_type: row.treatmentTypeId,
    total_treatment_cost: Number(digitsOf(row.totalCost) || '0'),
    total_paid: Number(digitsOf(row.totalPaid) || '0'),
    visit_number: context.visitNumber,
    tooth_number: row.toothNumber,
    start_date: context.startDate,
    completed_date: completionDateOf(row, context.today, context.startDate),
    notes: fields.notes,
    status: row.status,
  }
}

/**
 * Wire payload for `PATCH /api/v1/clinic/treatments/{id}/` — partial, like
 * every other PATCH on this backend (confirmed by how every existing edit
 * feature in this codebase already relies on that default). Only fields the
 * composer can actually resolve to a real value go in: `doctor` and
 * `treatment_type` only when the user touched that control, the same guard
 * `useUpdatePatient`/`useUpdateTreatmentType` use for exactly this reason —
 * the read response gives a name, not the id this needs, so an untouched
 * select cannot be trusted to carry the right one.
 */
export interface ExistingTreatmentPayload {
  doctor?: number
  treatment_type?: number
  total_treatment_cost: number
  total_paid: number
  /**
   * Sent only when the row is completed by this save. A row already completed
   * keeps its day on the server, and one reopened has it cleared there.
   */
  completed_date?: string
  notes: string
  status: TreatmentRow['status']
}

export function toExistingTreatmentPayload(
  row: TreatmentRow,
  fields: ComposerFields,
  touched: { doctor: boolean; treatmentType: boolean },
  context: { startDate: string; today: string },
): ExistingTreatmentPayload {
  const completedDate = completionDateOf(row, context.today, context.startDate)

  // `Number('')` is 0, and an unselected doctor is not doctor zero.
  const doctorId = fields.doctorId === '' ? null : Number(fields.doctorId)

  return {
    ...(touched.doctor && doctorId !== null && Number.isInteger(doctorId)
      ? { doctor: doctorId }
      : {}),
    ...(touched.treatmentType && row.treatmentTypeId !== null
      ? { treatment_type: row.treatmentTypeId }
      : {}),
    total_treatment_cost: Number(digitsOf(row.totalCost) || '0'),
    total_paid: Number(digitsOf(row.totalPaid) || '0'),
    ...(completedDate === null ? {} : { completed_date: completedDate }),
    notes: fields.notes,
    status: row.status,
  }
}
