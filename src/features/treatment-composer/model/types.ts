import type { TreatmentStatus } from '@/entities/treatment'

/**
 * One tooth's row in the composer — not the same shape as `Treatment`
 * (§4: an entity may not be reused as form state, since its fields come from
 * the wire and a row's come from the user).
 */
export interface TreatmentRow {
  /** Stable React key. Also how the save step tells rows apart. */
  rowId: string
  toothNumber: number
  treatmentTypeId: number | null
  /** For display before `treatmentTypeId` resolves, and for the existing row if it never does. */
  treatmentTypeName: string
  /** Digits only — a `MoneyInput` value, converted to a number at save time. */
  totalCost: string
  totalPaid: string
  /**
   * Set only for the single row that came from an existing `Treatment`
   * (edit mode). Every other row — including ones added during that same
   * edit — is `null` and becomes a new record.
   */
  existingTreatmentId: number | null
}

export interface ComposerFields {
  doctorId: string
  status: TreatmentStatus
  notes: string
}
