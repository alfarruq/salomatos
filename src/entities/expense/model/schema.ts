import * as v from 'valibot'
import { pageSchema } from '@/shared/api/pagination'
import { CALENDAR_MONTH } from '@/shared/lib/calendarMonth'
import {
  COMPENSATION_BASES,
  type Compensation,
  type DueMonth,
  EXPENSE_CATEGORIES,
  EXPENSE_METHODS,
  type Expense,
  type ExpensePage,
  type ExpenseSummary,
  type ExpenseTotals,
  type Payroll,
  RECURRING_CATEGORIES,
  type RecurringExpense,
} from './types'

/**
 * The **proposed** wire contract (see `/analysis/expenses.md` §8); no backend
 * serves it yet. The mock in `../api/mockServer.ts` answers in exactly these
 * shapes and goes through these same parses, so when the endpoints land only
 * the fetches change:
 *
 *   GET   /api/v1/clinic/expenses/?from&to&category&page   page envelope
 *   POST  /api/v1/clinic/expenses/                         one expense
 *   PATCH /api/v1/clinic/expenses/{id}/                    one expense
 *   POST  /api/v1/clinic/expenses/{id}/void/  {reason}     one expense
 *   GET   /api/v1/clinic/expenses/summary/?from&to         sums only
 *
 *   GET   /api/v1/clinic/recurring-expenses/               plain array
 *   POST  /api/v1/clinic/recurring-expenses/               one template
 *   PATCH /api/v1/clinic/recurring-expenses/{id}/          one template
 *   GET   /api/v1/clinic/recurring-expenses/due/?month     one month's slots
 *   POST  /api/v1/clinic/recurring-expenses/{id}/pay/      the new expense
 *   POST  /api/v1/clinic/recurring-expenses/{id}/skip/     the month's slot
 *
 *   GET   /api/v1/clinic/payroll/?month                    one row per doctor
 *   GET   /api/v1/clinic/doctors/{id}/compensation/        terms history, newest first
 *   POST  /api/v1/clinic/doctors/{id}/compensation/        a new terms entry
 *
 * The server must refuse all of them to doctors: the frontend gate is UX only (§3).
 * Payroll and compensation are for `superadmin` alone; the server must also
 * keep `doctor_share` and `staff_salary` rows out of what an admin is served.
 */
const som = v.pipe(v.number(), v.integer(), v.minValue(0))
const id = v.pipe(v.number(), v.integer())
const date = v.pipe(v.string(), v.isoDate())

/** A category this client does not know yet (a clinic's own) is shown as "other", not dropped. */
const categorySchema = v.fallback(v.picklist(EXPENSE_CATEGORIES), 'other')

export const expenseSchema = v.object({
  id,
  date,
  category: categorySchema,
  amount: v.pipe(v.number(), v.integer(), v.minValue(1)),
  method: v.picklist(EXPENSE_METHODS),
  payee: v.nullable(v.string()),
  note: v.nullable(v.string()),
  doctor_id: v.nullable(id),
  doctor: v.nullable(v.string()),
  is_void: v.boolean(),
  void_reason: v.nullable(v.string()),
  created_by: v.nullable(v.string()),
  // Optional on the wire: older rows and manual entries have no template.
  recurring_id: v.optional(v.nullable(id), null),
})

export const expensePageSchema = pageSchema(expenseSchema)

const totalsSchema = v.object({
  total: som,
  count: v.pipe(v.number(), v.integer(), v.minValue(0)),
  payroll: som,
  fixed: som,
  variable: som,
})

export const expenseSummarySchema = v.object({
  from: date,
  to: date,
  bucket: v.picklist(['day', 'week', 'month']),
  totals: totalsSchema,
  previous_totals: v.nullable(totalsSchema),
  by_category: v.array(v.object({ category: categorySchema, amount: som })),
  series: v.array(v.object({ start: date, amount: som })),
})

export type ExpenseResponse = v.InferOutput<typeof expenseSchema>
export type ExpensePageResponse = v.InferOutput<typeof expensePageSchema>
export type ExpenseSummaryResponse = v.InferOutput<typeof expenseSummarySchema>

export function toExpense(response: ExpenseResponse): Expense {
  return {
    id: response.id,
    date: response.date,
    category: response.category,
    amount: response.amount,
    method: response.method,
    payee: response.payee,
    note: response.note,
    doctorId: response.doctor_id,
    doctorName: response.doctor,
    isVoid: response.is_void,
    voidReason: response.void_reason,
    createdBy: response.created_by,
    recurringId: response.recurring_id,
  }
}

export function toExpensePage(response: ExpensePageResponse): ExpensePage {
  return {
    count: response.count,
    hasNext: response.next !== null,
    hasPrevious: response.previous !== null,
    results: response.results.map(toExpense),
  }
}

function toTotals(response: ExpenseSummaryResponse['totals']): ExpenseTotals {
  return { ...response }
}

export function toExpenseSummary(response: ExpenseSummaryResponse): ExpenseSummary {
  return {
    range: { from: response.from, to: response.to, bucket: response.bucket },
    totals: toTotals(response.totals),
    previousTotals: response.previous_totals === null ? null : toTotals(response.previous_totals),
    byCategory: response.by_category,
    series: response.series,
  }
}

const recurringCategorySchema = v.picklist(RECURRING_CATEGORIES)
const month = v.pipe(v.string(), v.regex(CALENDAR_MONTH))

export const recurringExpenseSchema = v.object({
  id,
  name: v.string(),
  category: recurringCategorySchema,
  amount: v.pipe(v.number(), v.integer(), v.minValue(1)),
  method: v.picklist(EXPENSE_METHODS),
  payee: v.nullable(v.string()),
  day_of_month: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(28)),
  is_active: v.boolean(),
})

export const recurringExpenseListSchema = v.array(recurringExpenseSchema)

export const dueMonthSchema = v.object({
  month,
  totals: v.object({ expected: som, paid: som, remaining: som }),
  items: v.array(
    v.object({
      recurring_id: id,
      name: v.string(),
      category: recurringCategorySchema,
      amount: som,
      method: v.picklist(EXPENSE_METHODS),
      payee: v.nullable(v.string()),
      due_date: date,
      status: v.picklist(['due', 'overdue', 'paid', 'skipped']),
      expense_id: v.nullable(id),
      paid_amount: v.nullable(som),
      paid_date: v.nullable(date),
    }),
  ),
})

export type RecurringExpenseResponse = v.InferOutput<typeof recurringExpenseSchema>
export type DueMonthResponse = v.InferOutput<typeof dueMonthSchema>

export function toRecurringExpense(response: RecurringExpenseResponse): RecurringExpense {
  return {
    id: response.id,
    name: response.name,
    category: response.category,
    amount: response.amount,
    method: response.method,
    payee: response.payee,
    dayOfMonth: response.day_of_month,
    isActive: response.is_active,
  }
}

export function toDueMonth(response: DueMonthResponse): DueMonth {
  return {
    month: response.month,
    totals: response.totals,
    items: response.items.map((item) => ({
      recurringId: item.recurring_id,
      name: item.name,
      category: item.category,
      amount: item.amount,
      method: item.method,
      payee: item.payee,
      dueDate: item.due_date,
      status: item.status,
      expenseId: item.expense_id,
      paidAmount: item.paid_amount,
      paidDate: item.paid_date,
    })),
  }
}

export const compensationSchema = v.object({
  id,
  doctor_id: id,
  percent: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
  fixed: som,
  base: v.picklist(COMPENSATION_BASES),
  deduct_lab: v.boolean(),
  effective_from: month,
  created_by: v.nullable(v.string()),
})

export const compensationListSchema = v.array(compensationSchema)

/** Signed: a balance or carry-over is negative when a doctor was paid ahead. */
const signedSom = v.pipe(v.number(), v.integer())

export const payrollSchema = v.object({
  month,
  rows: v.array(
    v.object({
      doctor_id: id,
      doctor: v.string(),
      compensation: v.nullable(compensationSchema),
      collected: som,
      billed: som,
      lab: som,
      base_amount: som,
      accrued: som,
      opening: signedSom,
      paid: som,
      balance: signedSom,
    }),
  ),
  totals: v.object({ accrued: som, paid: som, balance: signedSom }),
})

export type CompensationResponse = v.InferOutput<typeof compensationSchema>
export type PayrollResponse = v.InferOutput<typeof payrollSchema>

export function toCompensation(response: CompensationResponse): Compensation {
  return {
    id: response.id,
    doctorId: response.doctor_id,
    percent: response.percent,
    fixed: response.fixed,
    base: response.base,
    deductLab: response.deduct_lab,
    effectiveFrom: response.effective_from,
    createdBy: response.created_by,
  }
}

export function toPayroll(response: PayrollResponse): Payroll {
  return {
    month: response.month,
    totals: response.totals,
    rows: response.rows.map((row) => ({
      doctorId: row.doctor_id,
      doctorName: row.doctor,
      compensation: row.compensation === null ? null : toCompensation(row.compensation),
      collected: row.collected,
      billed: row.billed,
      lab: row.lab,
      baseAmount: row.base_amount,
      accrued: row.accrued,
      opening: row.opening,
      paid: row.paid,
      balance: row.balance,
    })),
  }
}
