/** One line of a prescription — `MedicineList` (drf-yasg). */
export interface Medicine {
  id: number
  name: string | null
  /** Integer on the server: how many of `type` per intake. */
  dose: number | null
  /** Dose form — a `DoseForm` code when this client wrote it, free text otherwise. */
  type: string | null
  /** A `Frequency` code, or free text from older rows. */
  frequency: string | null
  /** Integer on the server, in days — it has no unit field. */
  duration: number | null
  /** A `MealRelation` code, or free text from older rows. */
  meal: string | null
  /** Minutes before/after `meal`; 0 when the timing does not apply. */
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
