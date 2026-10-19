/**
 * ⚠️ TEMPORARY. An in-memory stand-in for the expense endpoints while the
 * backend has none. Delete this file and its calls in `./queries.ts` and the
 * three `features/expense-*` hooks once `/api/v1/clinic/expenses/` exists.
 *
 * Entries live in RAM only and are gone on reload. ⛔ Never move them to
 * localStorage to "keep" them: the storage allowlist is a P0 rule (§3), and
 * this is clinic money. Seeded rows are synthetic (§16.3) and generated
 * relative to the clinic's today, so every period has something to show.
 */
import { PAGE_SIZE } from '@/shared/api/pagination'
import { parseCalendarDate, toCalendarDate } from '@/shared/lib/calendarDate'
import { clinicNow } from '@/shared/lib/datetime'
import { addDays, type ReportRange } from '@/shared/lib/report'
import type { ExpensePayload } from '../model/formSchema'
import type { ExpensePageResponse, ExpenseResponse, ExpenseSummaryResponse } from '../model/schema'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_KIND,
  type ExpenseCategory,
  type ExpenseMethod,
} from '../model/types'

/** Long enough for the skeleton to be seen, so the loading state is reviewed too. */
const MOCK_LATENCY_MS = 400

/** Two years back: the "last 12 months" view compares against the 12 before it. */
const SEED_DAYS = 730

/** Every seeded amount rounds to 10 000 so'm, the way clinic sums look. */
const STEP = 10_000

const DOCTORS = [
  { id: 2, name: 'Sardor Usmonov', share: 9_500_000 },
  { id: 3, name: 'Malika Karimova', share: 7_200_000 },
  { id: 4, name: 'Jasur Toshmatov', share: 6_400_000 },
  { id: 5, name: 'Nilufar Aliyeva', share: 4_800_000 },
  { id: 6, name: 'Bekzod Rahimov', share: 3_600_000 },
]

const ENTERED_BY = ['Dilnoza Rasulova', 'Administrator']

/** mulberry32 — tiny, deterministic, good enough for fake rows. */
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
  return Math.max(STEP, Math.round(value / STEP) * STEP)
}

let rows: ExpenseResponse[] | null = null
let nextId = 1

function seed(): ExpenseResponse[] {
  const today = clinicNow().date
  const random = seededRandom(`expenses:${today}`)
  const seeded: ExpenseResponse[] = []

  const add = (
    date: string,
    category: ExpenseCategory,
    amount: number,
    method: ExpenseMethod,
    payee: string | null,
    extra: Partial<ExpenseResponse> = {},
  ) => {
    seeded.push({
      id: nextId++,
      date,
      category,
      amount: roundSom(amount),
      method,
      payee,
      note: null,
      doctor_id: null,
      doctor: null,
      is_void: false,
      void_reason: null,
      created_by: ENTERED_BY[Math.floor(random() * ENTERED_BY.length)] ?? null,
      ...extra,
    })
  }

  for (let offset = SEED_DAYS; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset)
    const day = parseCalendarDate(date)?.getDate() ?? 1
    const weekday = parseCalendarDate(date)?.getDay() ?? 1

    if (day === 1) {
      add(date, 'staff_salary', 4_500_000, 'card', 'Administrator, hamshira')
      add(date, 'staff_salary', 2_200_000, 'cash', 'Farrosh')
    }
    if (day === 3) add(date, 'communication', 650_000, 'transfer', 'Internet va telefon')
    if (day === 5) add(date, 'rent', 12_000_000, 'transfer', 'Bino ijarasi')
    if (day === 10) {
      add(date, 'utilities', 1_400_000 + random() * 900_000, 'transfer', 'Elektr energiyasi')
      add(date, 'utilities', 350_000 + random() * 500_000, 'transfer', 'Gaz')
      add(date, 'utilities', 180_000 + random() * 120_000, 'cash', 'Suv va chiqindi')
    }
    if (day === 15) add(date, 'taxes_fees', 2_100_000 + random() * 800_000, 'transfer', 'Soliq')
    if (day === 15 || day === 28) {
      for (const doctor of DOCTORS) {
        add(date, 'doctor_share', (doctor.share / 2) * (0.75 + random() * 0.5), 'cash', null, {
          doctor_id: doctor.id,
          doctor: doctor.name,
          note: day === 15 ? 'Avans' : null,
        })
      }
    }
    if (day === 20 && random() < 0.8) {
      add(date, 'marketing', 1_000_000 + random() * 2_500_000, 'card', 'Instagram reklama')
    }
    // Supplies and lab work come in on working days, a few times a week.
    if (weekday !== 0 && random() < 0.3) {
      add(date, 'materials', 300_000 + random() * 3_200_000, 'cash', 'Stom-Market')
    }
    if (weekday !== 0 && random() < 0.22) {
      add(date, 'lab', 600_000 + random() * 2_800_000, 'transfer', 'Zubtexnik laboratoriyasi')
    }
    if (random() < 0.02) {
      add(date, 'equipment', 1_500_000 + random() * 9_000_000, 'transfer', 'Uskuna xizmati')
    }
    if (random() < 0.08) add(date, 'other', 80_000 + random() * 600_000, 'cash', null)
  }

  // One voided entry, so the journal shows what a correction looks like.
  const recent = [...seeded].reverse().find((row) => row.category === 'materials')
  if (recent !== undefined) {
    recent.is_void = true
    recent.void_reason = 'Ikki marta kiritilgan'
  }
  return seeded
}

function store(): ExpenseResponse[] {
  rows ??= seed()
  return rows
}

function respond<T>(build: () => T, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      // A throw inside the timer would escape the promise; a server answers with an error.
      try {
        resolve(build())
      } catch (error) {
        reject(error)
      }
    }, MOCK_LATENCY_MS)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
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

function daysBetween(from: string, to: string): number {
  const start = parseCalendarDate(from)?.getTime() ?? 0
  const end = parseCalendarDate(to)?.getTime() ?? 0
  return Math.round((end - start) / 86_400_000) + 1
}

function activeIn(from: string, to: string): ExpenseResponse[] {
  return store().filter((row) => !row.is_void && row.date >= from && row.date <= to)
}

function totalsOf(list: ExpenseResponse[]): ExpenseSummaryResponse['totals'] {
  const totals = { total: 0, count: list.length, payroll: 0, fixed: 0, variable: 0 }
  for (const row of list) {
    totals.total += row.amount
    totals[EXPENSE_CATEGORY_KIND[row.category]] += row.amount
  }
  return totals
}

export interface MockListQuery {
  from: string
  to: string
  category: ExpenseCategory | null
  page: number
}

export const mockExpenseServer = {
  list(query: MockListQuery, signal?: AbortSignal): Promise<ExpensePageResponse> {
    return respond(() => {
      const matching = store()
        .filter(
          (row) =>
            row.date >= query.from &&
            row.date <= query.to &&
            (query.category === null || row.category === query.category),
        )
        .sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1))
      const start = (query.page - 1) * PAGE_SIZE
      const link = (page: number) => `/api/v1/clinic/expenses/?page=${page}`
      return {
        count: matching.length,
        next: start + PAGE_SIZE < matching.length ? link(query.page + 1) : null,
        previous: query.page > 1 ? link(query.page - 1) : null,
        results: matching.slice(start, start + PAGE_SIZE).map((row) => ({ ...row })),
      }
    }, signal)
  },

  summary(range: ReportRange, signal?: AbortSignal): Promise<ExpenseSummaryResponse> {
    return respond(() => {
      const current = activeIn(range.from, range.to)
      const length = daysBetween(range.from, range.to)
      const previousTo = addDays(range.from, -1)
      const previous = activeIn(addDays(previousTo, -(length - 1)), previousTo)

      const starts = bucketStarts(range)
      const series = starts.map((start, index) => {
        const end = index + 1 < starts.length ? addDays(starts[index + 1] ?? start, -1) : range.to
        const amount = current
          .filter((row) => row.date >= start && row.date <= end)
          .reduce((acc, row) => acc + row.amount, 0)
        return { start, amount }
      })

      return {
        from: range.from,
        to: range.to,
        bucket: range.bucket,
        totals: totalsOf(current),
        previous_totals: previous.length === 0 ? null : totalsOf(previous),
        by_category: EXPENSE_CATEGORIES.map((category) => ({
          category,
          amount: current
            .filter((row) => row.category === category)
            .reduce((acc, row) => acc + row.amount, 0),
        })).filter((row) => row.amount > 0),
        series,
      }
    }, signal)
  },

  /** `doctorName` stands in for the join the server will do from the id. */
  create(payload: ExpensePayload, doctorName: string | null): Promise<ExpenseResponse> {
    return respond(() => {
      const row: ExpenseResponse = {
        id: nextId++,
        ...withoutDoctor(payload),
        doctor_id: payload.doctor,
        doctor: payload.doctor === null ? null : doctorName,
        is_void: false,
        void_reason: null,
        created_by: 'Administrator',
      }
      store().push(row)
      return { ...row }
    })
  },

  update(id: number, payload: ExpensePayload, doctorName: string | null): Promise<ExpenseResponse> {
    return respond(() => {
      const row = findActive(id)
      Object.assign(row, withoutDoctor(payload), {
        doctor_id: payload.doctor,
        doctor: payload.doctor === null ? null : doctorName,
      })
      return { ...row }
    })
  },

  void(id: number, reason: string): Promise<ExpenseResponse> {
    return respond(() => {
      const row = findActive(id)
      row.is_void = true
      row.void_reason = reason
      return { ...row }
    })
  },
}

function withoutDoctor({ doctor: _doctor, ...rest }: ExpensePayload) {
  return rest
}

/** A voided entry is final, on the server too: it is corrected by a new one. */
function findActive(id: number): ExpenseResponse {
  const row = store().find((candidate) => candidate.id === id)
  if (row === undefined || row.is_void) throw new Error('Expense not found or already voided')
  return row
}

/** Tests only: a fresh store per test, so one test's writes do not leak into the next. */
export function resetMockExpenses(): void {
  rows = null
  nextId = 1
}
