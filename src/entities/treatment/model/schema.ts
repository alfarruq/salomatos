import * as v from 'valibot'
import { parseCalendarDate } from '@/shared/lib/calendarDate'
import type { Treatment } from './types'

/**
 * The wire contract for `/api/v1/clinic/treatments/?patient_id=` (ADR-006),
 * from `TreatmentList` (drf-yasg). Confirmed as a plain array, not the
 * paginated envelope `/clinic/treatment-types/` turned out to need — see that
 * entity's schema for the shape this project has been burned by twice.
 *
 * Every field but `id` is read defensively. `TreatmentList` marks most of them
 * required, but `PatientListSerializer`'s `doctor` and `treatment_type` made
 * the same promise and are absent for a patient with nothing on record — one
 * bad row should not empty a patient's whole treatment history.
 */

/** Absent or null both mean "nothing here" — see `entities/patient`'s schema. */
const optionalString = v.optional(v.nullable(v.string()), null)

/**
 * A number the server may send as a string.
 *
 * `remaining` is documented `readOnly` and typed `string` — the same
 * `SerializerMethodField` pattern that made every money figure on the patient
 * endpoints unreliable to type-trust. The other counters are declared
 * `integer`, but that promise has been wrong before too, so all of them go
 * through the same coercion.
 */
const optionalNumber = v.pipe(
  v.optional(v.nullable(v.union([v.number(), v.string()])), null),
  v.transform((value) => {
    if (value === null || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }),
)

/** Unknown values are dropped rather than rejected — see `entities/patient`'s `statusSchema`. */
const statusSchema = v.optional(
  v.fallback(v.nullable(v.picklist(['in_progress', 'completed'])), null),
  null,
)

export const treatmentSchema = v.object({
  id: v.pipe(v.number(), v.integer()),
  doctor: optionalString,
  treatment_type: optionalString,
  total_treatment_cost: optionalNumber,
  total_paid: optionalNumber,
  remaining: optionalNumber,
  visit_number: optionalNumber,
  tooth_number: optionalNumber,
  start_date: optionalString,
  notes: optionalString,
  status: statusSchema,
})

export const treatmentListSchema = v.array(treatmentSchema)

export type TreatmentResponse = v.InferOutput<typeof treatmentSchema>

/** `null` for anything the backend sent that is not a real calendar date. */
function toCalendarDateOrNull(value: string | null) {
  if (value === null) return null
  return parseCalendarDate(value) === null ? null : value
}

export function toTreatment(response: TreatmentResponse): Treatment {
  return {
    id: response.id,
    doctorName: response.doctor,
    treatmentTypeName: response.treatment_type,
    totalTreatmentCost: response.total_treatment_cost,
    totalPaid: response.total_paid,
    remaining: response.remaining,
    visitNumber: response.visit_number,
    toothNumber: response.tooth_number,
    startDate: toCalendarDateOrNull(response.start_date),
    notes: response.notes,
    status: response.status,
  }
}
