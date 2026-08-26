import * as v from 'valibot'
import type { TreatmentType } from './types'

/**
 * The wire contract for `/clinic/treatment-types/` (ADR-006).
 *
 * ⚠️ A plain array, like doctors and unlike patients. The published schema
 * shows a single object because `swagger_auto_schema` was given the serializer
 * without `many=True`; `get_treatment_types` returns a list.
 */

/**
 * A price the server may send as a string.
 *
 * `TreatmentTypeListSerializer` declares `IntegerField`, so a number is
 * expected — but the same reading of a `SerializerMethodField` was wrong twice
 * already on the patient endpoints, and a price that fails to parse would
 * empty the whole services table rather than one cell.
 */
const priceSchema = v.pipe(
  v.optional(v.nullable(v.union([v.number(), v.string()])), null),
  v.transform((value) => {
    if (value === null || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }),
)

export const treatmentTypeSchema = v.object({
  // A service without a name is not renderable; a service without a price is
  // ordinary — plenty are quoted per case.
  id: v.pipe(v.number(), v.integer()),
  name: v.string(),
  price: priceSchema,
})

export const treatmentTypeListSchema = v.array(treatmentTypeSchema)

export type TreatmentTypeResponse = v.InferOutput<typeof treatmentTypeSchema>

export function toTreatmentType(response: TreatmentTypeResponse): TreatmentType {
  return { id: response.id, name: response.name, price: response.price }
}
