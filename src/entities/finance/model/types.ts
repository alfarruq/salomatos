import type { CalendarDate } from '@/shared/lib/calendarDate'
import type { ReportRange } from '@/shared/lib/report'

/**
 * Money in so'm, whole numbers (§7.3). Every figure is the server's own sum:
 * the browser displays totals, it never adds money up.
 */
export interface FinanceTotals {
  /** Work done in the period, at its price. */
  billed: number
  /** Payments received in the period, for any work. */
  collected: number
  /** Billed in the period and not yet paid. */
  newDebt: number
  /** Everything owed to the clinic at the end of the period. */
  outstandingDebt: number
  debtorsCount: number
}

export interface FinanceSeriesPoint {
  /** First day of the bucket. */
  start: CalendarDate
  billed: number
  collected: number
}

export interface FinanceDoctorAmount {
  doctorId: number
  doctorName: string
  collected: number
}

export interface FinanceTreatmentTypeAmount {
  treatmentTypeId: number
  treatmentTypeName: string
  billed: number
}

/** ⚠️ PHI: a patient's name next to what they owe. Shown only behind `billing:read`. */
export interface FinanceDebtor {
  patientId: number
  patientName: string
  debt: number
  lastPaymentDate: CalendarDate | null
  doctorName: string | null
}

export interface FinanceOverview {
  range: ReportRange
  totals: FinanceTotals
  /** The same-length window right before this one, for the deltas. */
  previousTotals: FinanceTotals | null
  series: readonly FinanceSeriesPoint[]
  doctors: readonly FinanceDoctorAmount[]
  treatmentTypes: readonly FinanceTreatmentTypeAmount[]
  /** The largest debts, already sorted and capped by the server. */
  topDebtors: readonly FinanceDebtor[]
}
