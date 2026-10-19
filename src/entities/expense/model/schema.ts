import * as v from 'valibot'
import { pageSchema } from '@/shared/api/pagination'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_METHODS,
  type Expense,
  type ExpensePage,
  type ExpenseSummary,
  type ExpenseTotals,
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
 * The server must refuse all of them to doctors: the frontend gate is UX only (§3).
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
