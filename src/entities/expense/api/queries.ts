import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { cachePolicy } from '@/shared/config/cache'
import type { ReportRange } from '@/shared/lib/report'
import {
  expensePageSchema,
  expenseSummarySchema,
  toExpensePage,
  toExpenseSummary,
} from '../model/schema'
import type { ExpenseFilters, ExpensePage, ExpenseSummary } from '../model/types'
import { mockExpenseServer } from './mockServer'

export const expenseKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'expenses'] as const,

  list: (clinicId: number, filters: ExpenseFilters) =>
    [...expenseKeys.scope(clinicId), 'list', filters] as const,

  summary: (clinicId: number, range: ReportRange) =>
    [...expenseKeys.scope(clinicId), 'summary', range] as const,
}

/** Drives the "sample data" notice. Goes away with the mock. */
export const EXPENSES_SOURCE_IS_MOCK = true

/**
 * ⚠️ Served from `./mockServer.ts` until the backend has the endpoint. To
 * switch, replace the body with:
 *
 *   const params = new URLSearchParams({ from, to, page: String(page) })
 *   if (category !== null) params.set('category', category)
 *   const raw: unknown = await httpClient(`v1/clinic/expenses/?${params}`, { signal })
 *
 * The parse below stays as it is.
 */
export async function fetchExpenses(
  filters: ExpenseFilters,
  signal?: AbortSignal,
): Promise<ExpensePage> {
  const raw: unknown = await mockExpenseServer.list(filters, signal)
  return toExpensePage(v.parse(expensePageSchema, raw))
}

/**
 * ⚠️ Mock, as above. The real call:
 *
 *   const params = new URLSearchParams({ from: range.from, to: range.to })
 *   const raw: unknown = await httpClient(`v1/clinic/expenses/summary/?${params}`, { signal })
 */
export async function fetchExpenseSummary(
  range: ReportRange,
  signal?: AbortSignal,
): Promise<ExpenseSummary> {
  const raw: unknown = await mockExpenseServer.summary(range, signal)
  return toExpenseSummary(v.parse(expenseSummarySchema, raw))
}

export const expenseQueries = {
  list: (clinicId: number, filters: ExpenseFilters) =>
    queryOptions({
      queryKey: expenseKeys.list(clinicId, filters),
      queryFn: ({ signal }) => fetchExpenses(filters, signal),
      // Money: always refetched (§6.3), never optimistic.
      ...cachePolicy.financial,
      // Keeps the current page on screen while the next one loads.
      placeholderData: keepPreviousData,
    }),

  summary: (clinicId: number, range: ReportRange) =>
    queryOptions({
      queryKey: expenseKeys.summary(clinicId, range),
      queryFn: ({ signal }) => fetchExpenseSummary(range, signal),
      ...cachePolicy.financial,
      placeholderData: keepPreviousData,
    }),
}
