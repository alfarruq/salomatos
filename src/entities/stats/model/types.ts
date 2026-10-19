import type { CalendarDate } from '@/shared/lib/calendarDate'

/**
 * A preset window ending today (clinic time). Presets rather than free dates
 * for the MVP: they are what a clinic owner reaches for, and each one has an
 * obvious bucket size for its chart.
 */
export const STATS_PERIODS = ['week', 'month', 'quarter', 'year'] as const

export type StatsPeriod = (typeof STATS_PERIODS)[number]

export type StatsBucket = 'day' | 'week' | 'month'

export interface StatsRange {
  from: CalendarDate
  to: CalendarDate
  bucket: StatsBucket
}

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
  range: StatsRange
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
