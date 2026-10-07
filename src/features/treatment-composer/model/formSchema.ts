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
   * ⚠️ `null` for a non-dental treatment. The live endpoint currently answers
   * 400 to that (omitted and `null` alike) — it needs `tooth_number` made
   * optional server-side; there is no honest tooth to send instead.
   */
  tooth_number: number | null
  start_date: string
  notes: string
  status: ComposerFields['status']
}

export function toNewTreatmentPayload(
  row: TreatmentRow,
  fields: ComposerFields,
  context: { patientId: number; startDate: string; visitNumber: number },
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
    notes: fields.notes,
    status: fields.status,
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
  notes: string
  status: ComposerFields['status']
}

export function toExistingTreatmentPayload(
  row: TreatmentRow,
  fields: ComposerFields,
  touched: { doctor: boolean; treatmentType: boolean },
): ExistingTreatmentPayload {
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
    notes: fields.notes,
    status: fields.status,
  }
}
