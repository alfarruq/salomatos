/**
 * ⚠️ TEMPORARY. Made-up money figures for the MVP screen while the backend has
 * no payment ledger or finance endpoint. Delete this file and the one call in
 * `./queries.ts` once `GET /api/v1/clinic/finance/overview/` exists.
 *
 * Synthetic only (§16.3): the debtors are invented people with invented ids,
 * which is why the screen does not link them to patient cards while this
 * mock is in use. Seeded by the range, so a refetch does not reshuffle.
 */
import { parseCalendarDate, toCalendarDate } from '@/shared/lib/calendarDate'
import { addDays, type ReportRange } from '@/shared/lib/report'
import type { FinanceOverviewResponse } from '../model/schema'

const DOCTORS = [
  { id: 2, name: 'Sardor Usmonov', weight: 0.31 },
  { id: 3, name: 'Malika Karimova', weight: 0.23 },
  { id: 4, name: 'Jasur Toshmatov', weight: 0.2 },
  { id: 5, name: 'Nilufar Aliyeva', weight: 0.15 },
  { id: 6, name: 'Bekzod Rahimov', weight: 0.11 },
]

const TREATMENT_TYPES = [
  { id: 6, name: 'Implantatsiya', weight: 0.32 },
  { id: 5, name: 'Metall-keramika toj', weight: 0.2 },
  { id: 7, name: 'Breket tizimi', weight: 0.15 },
  { id: 3, name: 'Kanal davolash', weight: 0.13 },
  { id: 1, name: 'Plomba', weight: 0.11 },
  { id: 4, name: 'Tish olish', weight: 0.05 },
  { id: 2, name: 'Professional gigiyena', weight: 0.04 },
]

const METHODS = [
  { method: 'cash', weight: 0.38 },
  { method: 'card', weight: 0.27 },
  { method: 'click', weight: 0.17 },
  { method: 'payme', weight: 0.12 },
  { method: 'transfer', weight: 0.06 },
] as const

const DEBTORS = [
  'Aziza Yusupova',
  'Otabek Nazarov',
  'Gulnora Ergasheva',
  'Rustam Qodirov',
  'Dilfuza Hamidova',
  'Shoxrux Mirzayev',
  'Kamola Saidova',
  'Javlon Abdullayev',
]

/** Every amount rounds to 10 000 so'm, the way clinic prices are set. */
const STEP = 10_000

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

function roundSom(value: number): number {
  return Math.round(value / STEP) * STEP
}

function dailyBilled(date: string, random: () => number): number {
  const weekday = parseCalendarDate(date)?.getDay() ?? 1
  const base = weekday === 0 ? 1_500_000 : weekday === 6 ? 6_000_000 : 10_000_000
  return roundSom(base + random() * 6_000_000)
}

function bucketStarts(range: ReportRange): string[] {
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

/** Splits `total` by `weights` in whole steps, so the parts add back up exactly. */
function split(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0)
  const parts = weights.map((weight) => roundSom((total * weight) / sum))
  parts[0] = (parts[0] ?? 0) + total - parts.reduce((acc, part) => acc + part, 0)
  return parts
}

export function buildMockFinanceOverview(range: ReportRange): FinanceOverviewResponse {
  const random = seededRandom(`finance:${range.from}:${range.to}`)
  const starts = bucketStarts(range)

  const series = starts.map((start, index) => {
    const end = index + 1 < starts.length ? addDays(starts[index + 1] ?? start, -1) : range.to
    let billed = 0
    for (let date = start; date <= end; date = addDays(date, 1)) billed += dailyBilled(date, random)
    // Payments trail the work: most of it is paid, plus some old debt coming in.
    return { start, billed, collected: roundSom(billed * (0.78 + random() * 0.2)) }
  })

  const billed = series.reduce((acc, point) => acc + point.billed, 0)
  const collected = series.reduce((acc, point) => acc + point.collected, 0)
  const totals = {
    billed,
    collected,
    new_debt: roundSom(billed * 0.14),
    outstanding_debt: roundSom(billed * 0.31 + 25_000_000),
    debtors_count: 37 + Math.round(random() * 20),
  }
  const drift = 0.84 + random() * 0.28
  const previousTotals = {
    billed: roundSom(totals.billed * drift),
    collected: roundSom(totals.collected * (drift - 0.03)),
    new_debt: roundSom(totals.new_debt * (drift + 0.1)),
    outstanding_debt: roundSom(totals.outstanding_debt * 0.96),
    debtors_count: totals.debtors_count + 3,
  }

  const methodAmounts = split(
    collected,
    METHODS.map((row) => row.weight),
  )
  const doctorAmounts = split(
    collected,
    DOCTORS.map((row) => row.weight * (0.85 + random() * 0.3)),
  )
  const typeAmounts = split(
    billed,
    TREATMENT_TYPES.map((row) => row.weight),
  )

  const topDebtors = DEBTORS.map((name, index) => ({
    patient_id: 9001 + index,
    patient: name,
    debt: roundSom(400_000 + random() * 7_600_000),
    last_payment_date: random() < 0.15 ? null : addDays(range.to, -Math.round(random() * 120)),
    doctor: DOCTORS[index % DOCTORS.length]?.name ?? null,
  })).sort((a, b) => b.debt - a.debt)

  return {
    from: range.from,
    to: range.to,
    bucket: range.bucket,
    totals,
    previous_totals: previousTotals,
    series,
    payment_methods: METHODS.map((row, index) => ({
      method: row.method,
      amount: methodAmounts[index] ?? 0,
    })),
    doctors: DOCTORS.map((row, index) => ({
      doctor_id: row.id,
      doctor: row.name,
      collected: doctorAmounts[index] ?? 0,
    })),
    treatment_types: TREATMENT_TYPES.map((row, index) => ({
      treatment_type_id: row.id,
      treatment_type: row.name,
      billed: typeAmounts[index] ?? 0,
    })),
    top_debtors: topDebtors,
  }
}
