/** One line of a prescription — `MedicineList` (drf-yasg). */
export interface Medicine {
  id: number
  name: string | null
  dose: string | null
  type: string | null
  frequency: string | null
  duration: string | null
  meal: string | null
  /** Minutes relative to `meal` — the field the server does not otherwise explain. */
  minutes: number | null
}

/** A prescription — `RecipeList`, from `/api/v1/core/recipes/`. */
export interface Recipe {
  id: number
  doctorName: string | null
  notes: string | null
  clinicName: string | null
  /** UTC ISO-8601 instant; format at display time (§12.4). */
  createdAt: string | null
  medicines: readonly Medicine[]
}
