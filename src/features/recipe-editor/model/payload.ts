import { mealTakesMinutes } from '@/entities/recipe'
import type { CatalogMedicine } from './catalog'
import type { MedicineRow } from './types'

/** `POST /api/v1/core/recipes/` — every medicine field is required, confirmed live. */
export interface MedicinePayload {
  name: string
  dose: number
  type: string
  frequency: string
  duration: number
  meal: string
  minutes: number
}

export interface RecipePayload {
  patient: number
  doctor: number
  notes: string
  medicines: MedicinePayload[]
}

const DAYS_PER_WEEK = 7

let rowIdCounter = 0
function nextRowId(): string {
  rowIdCounter += 1
  return `medicine-${rowIdCounter}`
}

/** What "Dori qo'shish" opens with: the most common dental course. */
export function newMedicineRow(): MedicineRow {
  return {
    rowId: nextRowId(),
    name: '',
    dose: '1',
    form: 'tablet',
    frequency: 'bid',
    meal: 'after',
    minutes: '30',
    durationAmount: '5',
    durationUnit: 'days',
  }
}

/** Picking from the catalog fills the whole row, keeping only its identity. */
export function fillFromCatalog(row: MedicineRow, medicine: CatalogMedicine): MedicineRow {
  return {
    rowId: row.rowId,
    name: medicine.name,
    dose: String(medicine.dose),
    form: medicine.form,
    frequency: medicine.frequency,
    meal: medicine.meal,
    minutes: String(medicine.minutes),
    durationAmount: String(medicine.durationAmount),
    durationUnit: medicine.durationUnit,
  }
}

/** The server only takes integers; anything else is refused before it is sent. */
function parseInteger(value: string, min: number): number | null {
  if (!/^\d+$/.test(value.trim())) return null
  const parsed = Number(value)
  return parsed >= min ? parsed : null
}

/**
 * Null when the row cannot be saved as written. A dose or duration is never
 * guessed: a prescription that silently became "1 for 1 day" is worse than
 * one the doctor is asked to finish.
 */
export function toMedicinePayload(row: MedicineRow): MedicinePayload | null {
  const name = row.name.trim()
  const dose = parseInteger(row.dose, 1)
  const amount = parseInteger(row.durationAmount, 1)
  const takesMinutes = mealTakesMinutes(row.meal)
  const minutes = takesMinutes ? parseInteger(row.minutes === '' ? '0' : row.minutes, 0) : 0
  if (name === '' || dose === null || amount === null || minutes === null) return null

  return {
    name,
    dose,
    type: row.form,
    frequency: row.frequency,
    /*
     * ⚠️ The server's `duration` is a bare integer with no unit field, so a
     * course in weeks is stored as days. It reopens as "14 kun", not
     * "2 hafta" — the unit is lost until the backend adds one.
     */
    duration: row.durationUnit === 'weeks' ? amount * DAYS_PER_WEEK : amount,
    meal: row.meal,
    // `minutes` is non-nullable on the server; 0 means "does not apply".
    minutes,
  }
}

export function isRowComplete(row: MedicineRow): boolean {
  return toMedicinePayload(row) !== null
}

export function toRecipePayload(input: {
  patientId: number
  doctorId: number
  notes: string
  rows: MedicineRow[]
}): RecipePayload {
  return {
    patient: input.patientId,
    doctor: input.doctorId,
    notes: input.notes.trim(),
    medicines: input.rows.map(toMedicinePayload).filter((payload) => payload !== null),
  }
}
