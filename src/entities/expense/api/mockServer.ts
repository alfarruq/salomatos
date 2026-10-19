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
import { shiftMonth } from '@/shared/lib/calendarMonth'
import { clinicNow } from '@/shared/lib/datetime'
import { addDays, type ReportRange } from '@/shared/lib/report'
import type {
  CompensationPayload,
  ExpensePayload,
  PayDuePayload,
  RecurringPayload,
} from '../model/formSchema'
import type {
  CompensationResponse,
  DueMonthResponse,
  ExpensePageResponse,
  ExpenseResponse,
  ExpenseSummaryResponse,
  PayrollResponse,
  RecurringExpenseResponse,
} from '../model/schema'
import {
  type DueStatus,
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

/**
 * `collected` is a typical month's takings from the doctor's patients; the
 * last one has no terms yet, so the "not set" state is there to review.
 */
const DOCTORS = [
  { id: 2, name: 'Sardor Usmonov', collected: 32_000_000 },
  { id: 3, name: 'Malika Karimova', collected: 28_000_000 },
  { id: 4, name: 'Jasur Toshmatov', collected: 24_000_000 },
  { id: 5, name: 'Nilufar Aliyeva', collected: 19_000_000 },
  { id: 6, name: 'Bekzod Rahimov', collected: 9_000_000 },
  { id: 7, name: 'Zarina Qosimova', collected: 6_000_000 },
]

/** Lab bills run at about this share of what a doctor's patients pay. */
const LAB_RATE = 0.15

/** Each doctor's opening terms; Sardor's rise three months ago shows the history. */
function seedCompensations(start: string, thisMonth: string): CompensationResponse[] {
  const entry = (
    id: number,
    doctorId: number,
    terms: Pick<CompensationResponse, 'percent' | 'fixed' | 'base' | 'deduct_lab'>,
    effectiveFrom: string,
  ): CompensationResponse => ({
    id,
    doctor_id: doctorId,
    ...terms,
    effective_from: effectiveFrom,
    created_by: 'Administrator',
  })
  const percentOnly = { fixed: 0, base: 'collected', deduct_lab: true } as const
  return [
    entry(1, 2, { ...percentOnly, percent: 30 }, start),
    entry(2, 3, { ...percentOnly, percent: 30 }, start),
    entry(3, 4, { ...percentOnly, base: 'billed', percent: 25 }, start),
    entry(4, 5, { ...percentOnly, fixed: 2_000_000, percent: 15 }, start),
    entry(5, 6, { ...percentOnly, deduct_lab: false, percent: 40 }, start),
    entry(6, 2, { ...percentOnly, percent: 35 }, shiftMonth(thisMonth, -3)),
  ]
}

const ENTERED_BY = ['Dilnoza Rasulova', 'Administrator']

/** The monthly bills a clinic pays the same way every month. */
const SEED_TEMPLATES: RecurringExpenseResponse[] = [
  {
    id: 1,
    name: 'Xodimlar maoshi',
    category: 'staff_salary',
    amount: 4_500_000,
    method: 'card',
    payee: 'Administrator, hamshira',
    day_of_month: 1,
    is_active: true,
  },
  {
    id: 2,
    name: 'Farrosh maoshi',
    category: 'staff_salary',
    amount: 2_200_000,
    method: 'cash',
    payee: 'Farrosh',
    day_of_month: 1,
    is_active: true,
  },
  {
    id: 3,
    name: 'Internet va telefon',
    category: 'communication',
    amount: 650_000,
    method: 'transfer',
    payee: 'Internet va telefon',
    day_of_month: 3,
    is_active: true,
  },
  {
    id: 4,
    name: 'Bino ijarasi',
    category: 'rent',
    amount: 12_000_000,
    method: 'transfer',
    payee: 'Bino ijarasi',
    day_of_month: 5,
    is_active: true,
  },
  {
    id: 5,
    name: 'Elektr energiyasi',
    category: 'utilities',
    amount: 1_800_000,
    method: 'transfer',
    payee: 'Elektr energiyasi',
    day_of_month: 10,
    is_active: true,
  },
  {
    id: 6,
    name: 'Gaz',
    category: 'utilities',
    amount: 600_000,
    method: 'transfer',
    payee: 'Gaz',
    day_of_month: 10,
    is_active: true,
  },
  {
    id: 7,
    name: 'Suv va chiqindi',
    category: 'utilities',
    amount: 240_000,
    method: 'cash',
    payee: 'Suv va chiqindi',
    day_of_month: 10,
    is_active: true,
  },
  {
    id: 8,
    name: 'Soliq',
    category: 'taxes_fees',
    amount: 2_500_000,
    method: 'transfer',
    payee: 'Soliq',
    day_of_month: 15,
    is_active: true,
  },
  {
    id: 9,
    name: 'Klinika dasturi obunasi',
    category: 'communication',
    amount: 300_000,
    method: 'card',
    payee: 'SalomatOS',
    day_of_month: 25,
    is_active: true,
  },
]

/** Left unpaid this month, so the "overdue" state is there to review. */
const UNPAID_THIS_MONTH = 6

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

interface MockTemplate extends RecurringExpenseResponse {
  /** First month the template applies to: a new bill is not overdue for the past. */
  since: string
}

let templates: MockTemplate[] | null = null
let nextTemplateId = SEED_TEMPLATES.length + 1
/** `templateId:yyyy-MM` → the expense that paid it. The server keeps this link on the row. */
const payments = new Map<string, number>()
const skipped = new Set<string>()

let compensations: CompensationResponse[] | null = null
let nextCompensationId = 1

/** The first whole month of seeded history: payroll carries balances from there. */
function ledgerStart(): string {
  return shiftMonth(monthOf(addDays(clinicNow().date, -SEED_DAYS)), 1)
}

function compensationStore(): CompensationResponse[] {
  if (compensations === null) {
    compensations = seedCompensations(ledgerStart(), monthOf(clinicNow().date))
    nextCompensationId = compensations.length + 1
  }
  return compensations
}

/** The terms in force for a month: the latest entry that starts on or before it. */
function compensationFor(doctorId: number, month: string): CompensationResponse | null {
  let found: CompensationResponse | null = null
  for (const entry of compensationStore()) {
    if (entry.doctor_id !== doctorId || entry.effective_from > month) continue
    if (
      found === null ||
      entry.effective_from > found.effective_from ||
      (entry.effective_from === found.effective_from && entry.id > found.id)
    ) {
      found = entry
    }
  }
  return found
}

function daysIn(month: string): number {
  const [year = 0, index = 1] = month.split('-').map(Number)
  return new Date(year, index, 0).getDate()
}

/**
 * A doctor's month: takings, billed work and lab bills. Seeded by doctor and
 * month, not by today, so a month reads the same on every visit. The current
 * month is counted up to today; a future one has nothing yet.
 */
function figuresOf(doctor: (typeof DOCTORS)[number], month: string) {
  const today = clinicNow().date
  const thisMonth = monthOf(today)
  const part =
    month > thisMonth ? 0 : month === thisMonth ? Number(today.slice(8, 10)) / daysIn(month) : 1
  const random = seededRandom(`payroll:${doctor.id}:${month}`)
  const collected = Math.round((doctor.collected * (0.85 + random() * 0.3) * part) / STEP) * STEP
  const billed = Math.round((collected * (1.05 + random() * 0.15)) / STEP) * STEP
  const lab = Math.round((collected * LAB_RATE * (0.7 + random() * 0.6)) / STEP) * STEP
  return { collected, billed, lab }
}

function accrualOf(doctor: (typeof DOCTORS)[number], month: string) {
  const figures = figuresOf(doctor, month)
  const terms = compensationFor(doctor.id, month)
  if (terms === null) return { ...figures, terms, baseAmount: 0, accrued: 0 }
  const gross = terms.base === 'collected' ? figures.collected : figures.billed
  const baseAmount = Math.max(0, gross - (terms.deduct_lab ? figures.lab : 0))
  // Whole thousands: nobody hands out the last 437 so'm of a percent.
  const accrued = Math.round((baseAmount * terms.percent) / 100 / 1000) * 1000 + terms.fixed
  return { ...figures, terms, baseAmount, accrued }
}

function paidTo(doctorId: number, month: string): number {
  return store()
    .filter(
      (row) =>
        !row.is_void &&
        row.category === 'doctor_share' &&
        row.doctor_id === doctorId &&
        monthOf(row.date) === month,
    )
    .reduce((acc, row) => acc + row.amount, 0)
}

function monthOf(date: string): string {
  return date.slice(0, 7)
}

function slot(templateId: number, month: string): string {
  return `${templateId}:${month}`
}

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
      recurring_id: null,
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

  const thisMonth = monthOf(today)
  const pay = (date: string, templateId: number, amount?: number) => {
    const template = SEED_TEMPLATES.find((candidate) => candidate.id === templateId)
    if (template === undefined) return
    if (templateId === UNPAID_THIS_MONTH && monthOf(date) === thisMonth) return
    add(date, template.category, amount ?? template.amount, template.method, template.payee, {
      recurring_id: templateId,
    })
    payments.set(slot(templateId, monthOf(date)), nextId - 1)
  }

  for (let offset = SEED_DAYS; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset)
    const day = parseCalendarDate(date)?.getDate() ?? 1
    const weekday = parseCalendarDate(date)?.getDay() ?? 1

    if (day === 1) {
      pay(date, 1)
      pay(date, 2)
    }
    if (day === 3) pay(date, 3)
    if (day === 5) pay(date, 4)
    // Meter bills differ from the template every month: what was paid is what counts.
    if (day === 10) {
      pay(date, 5, 1_400_000 + random() * 900_000)
      pay(date, 6, 350_000 + random() * 500_000)
      pay(date, 7, 180_000 + random() * 120_000)
    }
    if (day === 15) pay(date, 8, 2_100_000 + random() * 800_000)
    if (day === 25) pay(date, 9)
    // An advance on the 15th, the rest on the 28th: past months settle to zero.
    if ((day === 15 || day === 28) && monthOf(date) >= ledgerStart()) {
      for (const doctor of DOCTORS) {
        const { accrued } = accrualOf(doctor, monthOf(date))
        if (accrued === 0) continue
        const advance = roundSom(accrued * 0.4)
        add(date, 'doctor_share', 0, 'cash', null, {
          amount: day === 15 ? advance : accrued - advance,
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

function templateStore(): MockTemplate[] {
  if (templates === null) {
    store()
    const since = monthOf(addDays(clinicNow().date, -SEED_DAYS))
    templates = SEED_TEMPLATES.map((template) => ({ ...template, since }))
  }
  return templates
}

function findTemplate(id: number): MockTemplate {
  const template = templateStore().find((candidate) => candidate.id === id)
  if (template === undefined) throw new Error('Recurring expense not found')
  return template
}

/** A voided payment frees its month again: the bill is still owed. */
function paymentOf(templateId: number, month: string): ExpenseResponse | null {
  const expenseId = payments.get(slot(templateId, month))
  const row = store().find((candidate) => candidate.id === expenseId)
  return row === undefined || row.is_void ? null : row
}

function publicTemplate({ since: _since, ...template }: MockTemplate): RecurringExpenseResponse {
  return { ...template }
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
        recurring_id: null,
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

  listRecurring(signal?: AbortSignal): Promise<RecurringExpenseResponse[]> {
    return respond(
      () =>
        templateStore()
          .map(publicTemplate)
          .sort((a, b) => a.day_of_month - b.day_of_month || a.id - b.id),
      signal,
    )
  },

  createRecurring(payload: RecurringPayload): Promise<RecurringExpenseResponse> {
    return respond(() => {
      const template: MockTemplate = {
        id: nextTemplateId++,
        ...payload,
        is_active: true,
        since: monthOf(clinicNow().date),
      }
      templateStore().push(template)
      return publicTemplate(template)
    })
  },

  updateRecurring(
    id: number,
    payload: Partial<RecurringPayload> & { is_active?: boolean },
  ): Promise<RecurringExpenseResponse> {
    return respond(() => {
      const template = findTemplate(id)
      Object.assign(template, payload)
      return publicTemplate(template)
    })
  },

  due(month: string, signal?: AbortSignal): Promise<DueMonthResponse> {
    return respond(() => {
      const today = clinicNow().date
      const items = templateStore()
        .filter((template) => template.since <= month)
        .map((template) => {
          const dueDate = `${month}-${String(template.day_of_month).padStart(2, '0')}`
          const paid = paymentOf(template.id, month)
          const status: DueStatus =
            paid !== null
              ? 'paid'
              : skipped.has(slot(template.id, month))
                ? 'skipped'
                : dueDate < today
                  ? 'overdue'
                  : 'due'
          return {
            recurring_id: template.id,
            name: template.name,
            category: template.category,
            amount: template.amount,
            method: template.method,
            payee: template.payee,
            due_date: dueDate,
            status,
            expense_id: paid?.id ?? null,
            paid_amount: paid?.amount ?? null,
            paid_date: paid?.date ?? null,
            isActive: template.is_active,
          }
        })
        // A paused bill stays in the months it was settled in, and nowhere else.
        .filter((item) => item.isActive || item.status === 'paid')
        .map(({ isActive: _isActive, ...item }) => item)
        .sort((a, b) =>
          a.due_date === b.due_date
            ? a.recurring_id - b.recurring_id
            : a.due_date < b.due_date
              ? -1
              : 1,
        )

      const open = items.filter((item) => item.status === 'due' || item.status === 'overdue')
      const sum = (list: { amount: number }[]) => list.reduce((acc, item) => acc + item.amount, 0)
      return {
        month,
        totals: {
          expected: sum(items.filter((item) => item.status !== 'skipped')),
          paid: items.reduce((acc, item) => acc + (item.paid_amount ?? 0), 0),
          remaining: sum(open),
        },
        items,
      }
    }, signal)
  },

  /** Records what was really paid for one month of a template, as a normal expense. */
  pay(id: number, payload: PayDuePayload): Promise<ExpenseResponse> {
    return respond(() => {
      const template = findTemplate(id)
      if (paymentOf(id, payload.month) !== null) throw new Error('This month is already paid')
      const row: ExpenseResponse = {
        id: nextId++,
        recurring_id: id,
        date: payload.date,
        category: template.category,
        amount: payload.amount,
        method: payload.method,
        payee: template.payee,
        note: payload.note,
        doctor_id: null,
        doctor: null,
        is_void: false,
        void_reason: null,
        created_by: 'Administrator',
      }
      store().push(row)
      payments.set(slot(id, payload.month), row.id)
      skipped.delete(slot(id, payload.month))
      return { ...row }
    })
  },

  /**
   * Every doctor's month. What was paid is read from the `doctor_share`
   * expenses dated in it, so a payout is entered once, in the journal, and
   * a late one is carried by `opening` into the next month.
   */
  payroll(month: string, signal?: AbortSignal): Promise<PayrollResponse> {
    return respond(() => {
      const start = ledgerStart()
      const rows = DOCTORS.map((doctor) => {
        let opening = 0
        for (let cursor = start; cursor < month; cursor = shiftMonth(cursor, 1)) {
          opening += accrualOf(doctor, cursor).accrued - paidTo(doctor.id, cursor)
        }
        const accrual = accrualOf(doctor, month)
        const paid = paidTo(doctor.id, month)
        return {
          doctor_id: doctor.id,
          doctor: doctor.name,
          compensation: accrual.terms === null ? null : { ...accrual.terms },
          collected: accrual.collected,
          billed: accrual.billed,
          lab: accrual.lab,
          base_amount: accrual.baseAmount,
          accrued: accrual.accrued,
          opening,
          paid,
          balance: opening + accrual.accrued - paid,
        }
      })
      return {
        month,
        rows,
        totals: {
          accrued: rows.reduce((acc, row) => acc + row.accrued, 0),
          paid: rows.reduce((acc, row) => acc + row.paid, 0),
          balance: rows.reduce((acc, row) => acc + row.balance, 0),
        },
      }
    }, signal)
  },

  compensationHistory(doctorId: number, signal?: AbortSignal): Promise<CompensationResponse[]> {
    return respond(
      () =>
        compensationStore()
          .filter((entry) => entry.doctor_id === doctorId)
          .sort((a, b) =>
            a.effective_from === b.effective_from
              ? b.id - a.id
              : a.effective_from < b.effective_from
                ? 1
                : -1,
          )
          .map((entry) => ({ ...entry })),
      signal,
    )
  },

  /** New terms from a month on. Entries are never edited; a later one wins. */
  setCompensation(doctorId: number, payload: CompensationPayload): Promise<CompensationResponse> {
    return respond(() => {
      if (!DOCTORS.some((doctor) => doctor.id === doctorId)) throw new Error('Doctor not found')
      const entry: CompensationResponse = {
        id: nextCompensationId++,
        doctor_id: doctorId,
        ...payload,
        created_by: 'Administrator',
      }
      compensationStore().push(entry)
      return { ...entry }
    })
  },

  /** "Not this month" (a holiday, a waived bill): nothing is posted. */
  skip(id: number, month: string): Promise<void> {
    return respond(() => {
      findTemplate(id)
      if (paymentOf(id, month) !== null) throw new Error('This month is already paid')
      skipped.add(slot(id, month))
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
  templates = null
  nextTemplateId = SEED_TEMPLATES.length + 1
  payments.clear()
  skipped.clear()
  compensations = null
  nextCompensationId = 1
}
