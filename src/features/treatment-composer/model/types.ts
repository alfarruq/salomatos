import type { TreatmentStatus } from '@/entities/treatment'

/**
 * One tooth's row in the composer — not the same shape as `Treatment`
 * (§4: an entity may not be reused as form state, since its fields come from
 * the wire and a row's come from the user).
 */
export interface TreatmentRow {
  /** Stable React key. Also how the save step tells rows apart. */
  rowId: string
  /** Only a dental doctor's rows have one — other specialties do not work on a tooth. */
  toothNumber: number | null
  treatmentTypeId: number | null
  /** For display before `treatmentTypeId` resolves, and for the existing row if it never does. */
  treatmentTypeName: string
  /** Digits only — a `MoneyInput` value, converted to a number at save time. */
  totalCost: string
  totalPaid: string
  /** Per row, not per save: one visit can finish one tooth and leave another in progress. */
  status: TreatmentStatus
  /**
   * The saved status of an existing row, `null` for a new one. A row that was
   * already completed keeps its completion day on re-save, even one recorded
   * before the backend stored that day.
   */
  initialStatus: TreatmentStatus | null
  /**
   * Set only for the single row that came from an existing `Treatment`
   * (edit mode). Every other row — including ones added during that same
   * edit — is `null` and becomes a new record.
   */
  existingTreatmentId: number | null
}

/** Shared by every row of one save — the backend repeats them on each entry. */
export interface ComposerFields {
  doctorId: string
  notes: string
}
