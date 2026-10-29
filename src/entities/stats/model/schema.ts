import * as v from 'valibot'
import type { StatsOverview, StatsTotals } from './types'

/**
 * Wire contract of `GET /api/v1/statistics/overview/?from=YYYY-MM-DD&to=YYYY-MM-DD`
 * (and of `statistics/me/`, the same report for the signed-in doctor).
 *
 * Aggregates only, computed server-side in the clinic's zone (§14): the
 * browser never pages through rows to count them.
 */
const count = v.pipe(v.number(), v.integer(), v.minValue(0))
const date = v.pipe(v.string(), v.isoDate())

const totalsSchema = v.object({
  appointments: count,
  appointments_completed: count,
  new_patients: count,
  returning_patients: count,
  treatments_completed: count,
  treatments_started: count,
  treatments_in_progress: count,
})

export const statsOverviewSchema = v.object({
  from: date,
  to: date,
  bucket: v.picklist(['day', 'week', 'month']),
  totals: totalsSchema,
  previous_totals: v.nullable(totalsSchema),
  appointments_series: v.array(v.object({ start: date, total: count, completed: count })),
  treatments_series: v.array(v.object({ start: date, completed: count })),
  doctors: v.array(
    v.object({
      doctor_id: v.pipe(v.number(), v.integer()),
      doctor: v.string(),
      appointments: count,
      treatments_completed: count,
    }),
  ),
  treatment_types: v.array(
    v.object({
      treatment_type_id: v.pipe(v.number(), v.integer()),
      treatment_type: v.string(),
      count,
    }),
  ),
  busy_hours: v.array(
    v.object({
      weekday: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(7)),
      hour: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(23)),
      appointments: count,
    }),
  ),
  teeth: v.array(v.object({ tooth: v.pipe(v.string(), v.regex(/^[1-4][1-8]$/)), count })),
})

export type StatsOverviewResponse = v.InferOutput<typeof statsOverviewSchema>

function toTotals(response: StatsOverviewResponse['totals']): StatsTotals {
  return {
    appointments: response.appointments,
    appointmentsCompleted: response.appointments_completed,
    newPatients: response.new_patients,
    returningPatients: response.returning_patients,
    treatmentsCompleted: response.treatments_completed,
    treatmentsStarted: response.treatments_started,
    treatmentsInProgress: response.treatments_in_progress,
  }
}

export function toStatsOverview(response: StatsOverviewResponse): StatsOverview {
  return {
    range: { from: response.from, to: response.to, bucket: response.bucket },
    totals: toTotals(response.totals),
    previousTotals: response.previous_totals === null ? null : toTotals(response.previous_totals),
    appointmentsSeries: response.appointments_series,
    treatmentsSeries: response.treatments_series,
    doctors: response.doctors.map((row) => ({
      doctorId: row.doctor_id,
      doctorName: row.doctor,
      appointments: row.appointments,
      treatmentsCompleted: row.treatments_completed,
    })),
    treatmentTypes: response.treatment_types.map((row) => ({
      treatmentTypeId: row.treatment_type_id,
      treatmentTypeName: row.treatment_type,
      count: row.count,
    })),
    busySlots: response.busy_hours,
    teeth: response.teeth,
  }
}
