/**
 * ⚠️ TEMPORARY. Made-up statistics for the MVP screen while the backend has
 * no aggregate endpoint. Delete this file and the one call in `./queries.ts`
 * once `GET /api/v1/clinic/stats/overview/` exists.
 *
 * Synthetic counts and staff/service names only — no patient appears here.
 * Seeded by the range, so a refetch or a re-render does not reshuffle the
 * charts under the viewer.
 */
import { parseCalendarDate, toCalendarDate } from '@/shared/lib/calendarDate'
import { addDays } from '../model/period'
import type { StatsOverviewResponse } from '../model/schema'
import type { StatsRange } from '../model/types'

const DOCTORS = [
  { id: 2, name: 'Sardor Usmonov', weight: 0.28 },
  { id: 3, name: 'Malika Karimova', weight: 0.24 },
  { id: 4, name: 'Jasur Toshmatov', weight: 0.19 },
  { id: 5, name: 'Nilufar Aliyeva', weight: 0.17 },
  { id: 6, name: 'Bekzod Rahimov', weight: 0.12 },
]

const TREATMENT_TYPES = [
  { id: 1, name: 'Plomba', weight: 0.3 },
  { id: 2, name: 'Professional gigiyena', weight: 0.18 },
  { id: 3, name: 'Kanal davolash', weight: 0.16 },
  { id: 4, name: 'Tish olish', weight: 0.13 },
  { id: 5, name: 'Metall-keramika toj', weight: 0.1 },
  { id: 6, name: 'Implantatsiya', weight: 0.08 },
  { id: 7, name: 'Breket tizimi', weight: 0.05 },
]

/**
 * How often each tooth type ends up treated: molars far more than incisors.
 * Keyed by the FDI position digit (1 = central incisor … 8 = wisdom tooth).
 */
const TOOTH_POSITION_WEIGHTS = [1, 0.8, 0.6, 1.1, 1.4, 3, 2.4, 0.9]

/** Relative load by clinic hour: a late-morning peak and an after-work one. */
const HOUR_WEIGHTS: Record<number, number> = {
  9: 0.6,
  10: 1,
  11: 1,
  12: 0.7,
  13: 0.4,
  14: 0.7,
  15: 0.9,
  16: 1,
  17: 0.8,
  18: 0.5,
}

/** mulberry32 — tiny, deterministic, good enough for fake charts. */
function seededRandom(seed: string): () => number {
  let state = 0
  for (const char of seed) state = (Math.imul(31, state) + char.charCodeAt(0)) | 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function isoWeekday(date: string): number {
  const day = parseCalendarDate(date)?.getDay() ?? 1
  return day === 0 ? 7 : day
}

function dailyAppointments(date: string, random: () => number): number {
  // Sunday is a short day in most clinics; Saturday a lighter one.
  const weekday = isoWeekday(date)
  const base = weekday === 7 ? 4 : weekday === 6 ? 16 : 26
  return Math.round(base + random() * 10)
}

function bucketStarts(range: StatsRange): string[] {
  const starts: string[] = []
  if (range.bucket === 'day') {
    for (let date = range.from; date <= range.to; date = addDays(date, 1)) starts.push(date)
  } else if (range.bucket === 'week') {
    for (let date = range.from; date <= range.to; date = addDays(date, 7)) starts.push(date)
  } else {
    starts.push(range.from)
    const cursor = parseCalendarDate(range.from) ?? new Date()
    cursor.setDate(1)
    for (;;) {
      cursor.setMonth(cursor.getMonth() + 1)
      const start = toCalendarDate(cursor)
      if (start > range.to) break
      starts.push(start)
    }
  }
  return starts
}

/** Splits `total` by `weights` so the parts add back up exactly. */
function split(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0)
  const parts = weights.map((weight) => Math.floor((total * weight) / sum))
  parts[0] = (parts[0] ?? 0) + total - parts.reduce((acc, part) => acc + part, 0)
  return parts
}

export function buildMockStatsOverview(range: StatsRange): StatsOverviewResponse {
  const random = seededRandom(`${range.from}:${range.to}`)
  const starts = bucketStarts(range)

  const series = starts.map((start, index) => {
    const end = index + 1 < starts.length ? addDays(starts[index + 1] ?? start, -1) : range.to
    let total = 0
    for (let date = start; date <= end; date = addDays(date, 1)) {
      total += dailyAppointments(date, random)
    }
    // Today is still in progress, so far fewer of its visits are completed.
    const doneShare = end === range.to ? 0.55 : 0.88 + random() * 0.08
    return { start, total, completed: Math.round(total * doneShare) }
  })

  const appointments = series.reduce((acc, point) => acc + point.total, 0)
  const completed = series.reduce((acc, point) => acc + point.completed, 0)
  const totals = {
    appointments,
    appointments_completed: completed,
    new_patients: Math.round(appointments * 0.22),
    returning_patients: Math.round(appointments * 0.41),
    treatments_completed: Math.round(completed * 0.74),
    treatments_started: Math.round(completed * 0.81),
    treatments_in_progress: Math.round(completed * 0.29),
  }
  const drift = 0.82 + random() * 0.3
  const previousTotals = {
    appointments: Math.round(totals.appointments * drift),
    appointments_completed: Math.round(totals.appointments_completed * drift),
    new_patients: Math.round(totals.new_patients * (drift + 0.08)),
    returning_patients: Math.round(totals.returning_patients * (drift - 0.04)),
    treatments_completed: Math.round(totals.treatments_completed * drift),
    treatments_started: Math.round(totals.treatments_started * drift),
    treatments_in_progress: Math.round(totals.treatments_in_progress * (drift + 0.05)),
  }

  const doctorAppointments = split(
    appointments,
    DOCTORS.map((doctor) => doctor.weight),
  )
  const doctorTreatments = split(
    totals.treatments_completed,
    DOCTORS.map((doctor) => doctor.weight * (0.8 + random() * 0.4)),
  )
  const typeCounts = split(
    totals.treatments_completed,
    TREATMENT_TYPES.map((type) => type.weight),
  )

  const treatmentsByBucket = split(
    totals.treatments_completed,
    series.map((point) => point.completed * (0.85 + random() * 0.3)),
  )

  const teeth = [1, 2, 3, 4].flatMap((quadrant) =>
    TOOTH_POSITION_WEIGHTS.map((weight, index) => ({
      tooth: `${quadrant}${index + 1}`,
      // Lower molars wear out faster than upper ones.
      weight: weight * (quadrant >= 3 && index >= 5 ? 1.2 : 1) * (0.7 + random() * 0.6),
    })),
  )
  const toothCounts = split(
    totals.treatments_completed,
    teeth.map((tooth) => tooth.weight),
  )

  const slots = [1, 2, 3, 4, 5, 6, 7].flatMap((weekday) =>
    Object.keys(HOUR_WEIGHTS).map((hour) => ({ weekday, hour: Number(hour) })),
  )
  const slotCounts = split(
    appointments,
    slots.map(({ weekday, hour }) => {
      const dayWeight = weekday === 7 ? 0.15 : weekday === 6 ? 0.6 : 1
      return (HOUR_WEIGHTS[hour] ?? 0) * dayWeight * (0.85 + random() * 0.3)
    }),
  )

  return {
    from: range.from,
    to: range.to,
    bucket: range.bucket,
    totals,
    previous_totals: previousTotals,
    appointments_series: series,
    treatments_series: series.map((point, index) => ({
      start: point.start,
      completed: treatmentsByBucket[index] ?? 0,
    })),
    doctors: DOCTORS.map((doctor, index) => ({
      doctor_id: doctor.id,
      doctor: doctor.name,
      appointments: doctorAppointments[index] ?? 0,
      treatments_completed: doctorTreatments[index] ?? 0,
    })),
    treatment_types: TREATMENT_TYPES.map((type, index) => ({
      treatment_type_id: type.id,
      treatment_type: type.name,
      count: typeCounts[index] ?? 0,
    })),
    busy_hours: slots.map((slot, index) => ({ ...slot, appointments: slotCounts[index] ?? 0 })),
    teeth: teeth.map((tooth, index) => ({ tooth: tooth.tooth, count: toothCounts[index] ?? 0 })),
  }
}
