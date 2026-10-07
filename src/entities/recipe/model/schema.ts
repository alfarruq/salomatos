import * as v from 'valibot'
import type { Medicine, Recipe } from './types'

/**
 * The wire contract for `/api/v1/core/recipes/?patient_id=` (ADR-006), from
 * `RecipeList` (drf-yasg). Confirmed as a plain array, not the paginated
 * envelope `/clinic/treatment-types/` turned out to need.
 *
 * Only `id` is trusted as required. `RecipeList` marks the rest required too,
 * but that promise has been wrong before on this backend, and a prescription
 * a doctor cannot fully read is still safer shown than dropped outright.
 */

/** Absent or null both mean "nothing here" — see `entities/patient`'s schema. */
const optionalString = v.optional(v.nullable(v.string()), null)

const optionalNumber = v.pipe(
  v.optional(v.nullable(v.union([v.number(), v.string()])), null),
  v.transform((value) => {
    if (value === null || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }),
)

const medicineSchema = v.object({
  id: v.pipe(v.number(), v.integer()),
  name: optionalString,
  dose: optionalString,
  type: optionalString,
  frequency: optionalString,
  duration: optionalString,
  meal: optionalString,
  minutes: optionalNumber,
})

export const recipeSchema = v.object({
  id: v.pipe(v.number(), v.integer()),
  doctor: optionalString,
  notes: optionalString,
  clinic: optionalString,
  created_at: optionalString,
  medicines: v.optional(v.fallback(v.array(medicineSchema), []), []),
})

export const recipeListSchema = v.array(recipeSchema)

export type RecipeResponse = v.InferOutput<typeof recipeSchema>

function toMedicine(response: v.InferOutput<typeof medicineSchema>): Medicine {
  return {
    id: response.id,
    name: response.name,
    dose: response.dose,
    type: response.type,
    frequency: response.frequency,
    duration: response.duration,
    meal: response.meal,
    minutes: response.minutes,
  }
}

export function toRecipe(response: RecipeResponse): Recipe {
  return {
    id: response.id,
    doctorName: response.doctor,
    notes: response.notes,
    clinicName: response.clinic,
    createdAt: response.created_at,
    medicines: response.medicines.map(toMedicine),
  }
}
