import type { CalendarDate } from '@/shared/lib/calendarDate'
import type { ReportRange } from '@/shared/lib/report'

export type {
  ReportBucket as StatsBucket,
  ReportPeriod as StatsPeriod,
  ReportRange as StatsRange,
} from '@/shared/lib/report'
/** The statistics names for the shared report period types (`shared/lib/report`). */
export { REPORT_PERIODS as STATS_PERIODS } from '@/shared/lib/report'

/** Counts only — no names, phones or money: statistics carries no PHI (finance is its own section). */
export interface StatsTotals {
  appointments: number
  appointmentsCompleted: number
  newPatients: number
  returningPatients: number
  treatmentsCompleted: number
  /** Treatments opened in the period. */
  treatmentsStarted: number
  /** Open at the end of the period, whenever they were started. */
  treatmentsInProgress: number
}

export interface StatsSeriesPoint {
  /** First day of the bucket. */
  start: CalendarDate
  total: number
  completed: number
}

export interface StatsTreatmentPoint {
  /** First day of the bucket. */
  start: CalendarDate
  completed: number
}

export interface StatsDoctorLoad {
  doctorId: number
  doctorName: string
  appointments: number
  treatmentsCompleted: number
}

export interface StatsTreatmentTypeCount {
  treatmentTypeId: number
  treatmentTypeName: string
  count: number
}

export interface StatsBusySlot {
  /** ISO weekday, 1 = Monday. */
  weekday: number
  /** Clinic-time hour, 0–23. */
  hour: number
  appointments: number
}

/** Completed treatments on one tooth, by FDI number ("11"–"48"). */
export interface StatsToothCount {
  tooth: string
  count: number
}

export interface StatsOverview {
  range: ReportRange
  totals: StatsTotals
  /** The same-length window right before this one, for the deltas. */
  previousTotals: StatsTotals | null
  appointmentsSeries: readonly StatsSeriesPoint[]
  treatmentsSeries: readonly StatsTreatmentPoint[]
  doctors: readonly StatsDoctorLoad[]
  treatmentTypes: readonly StatsTreatmentTypeCount[]
  busySlots: readonly StatsBusySlot[]
  teeth: readonly StatsToothCount[]
}
