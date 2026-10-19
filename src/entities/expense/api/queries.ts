import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { cachePolicy } from '@/shared/config/cache'
import type { ReportRange } from '@/shared/lib/report'
import {
  compensationListSchema,
  dueMonthSchema,
  expensePageSchema,
  expenseSummarySchema,
  payrollSchema,
  recurringExpenseListSchema,
  toCompensation,
  toDueMonth,
  toExpensePage,
  toExpenseSummary,
  toPayroll,
  toRecurringExpense,
} from '../model/schema'
import type {
  CalendarMonth,
  Compensation,
  DueMonth,
  ExpenseFilters,
  ExpensePage,
  ExpenseSummary,
  Payroll,
  RecurringExpense,
} from '../model/types'
import { mockExpenseServer } from './mockServer'

export const expenseKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'expenses'] as const,

  list: (clinicId: number, filters: ExpenseFilters) =>
    [...expenseKeys.scope(clinicId), 'list', filters] as const,

  summary: (clinicId: number, range: ReportRange) =>
    [...expenseKeys.scope(clinicId), 'summary', range] as const,

  // Under the same scope on purpose: paying a bill adds an expense, so one
  // invalidation refreshes the journal, the summary and the month together.
  recurring: (clinicId: number) => [...expenseKeys.scope(clinicId), 'recurring'] as const,

  due: (clinicId: number, month: CalendarMonth) =>
    [...expenseKeys.scope(clinicId), 'due', month] as const,

  // Payroll reads the doctor_share expenses, so it lives under the same scope.
  payroll: (clinicId: number, month: CalendarMonth) =>
    [...expenseKeys.scope(clinicId), 'payroll', month] as const,

  compensation: (clinicId: number, doctorId: number) =>
    [...expenseKeys.scope(clinicId), 'compensation', doctorId] as const,
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

/**
 * ⚠️ Mock, as above. The real call:
 *
 *   const raw: unknown = await httpClient('v1/clinic/recurring-expenses/', { signal })
 */
export async function fetchRecurringExpenses(signal?: AbortSignal): Promise<RecurringExpense[]> {
  const raw: unknown = await mockExpenseServer.listRecurring(signal)
  return v.parse(recurringExpenseListSchema, raw).map(toRecurringExpense)
}

/**
 * ⚠️ Mock, as above. The real call:
 *
 *   const raw: unknown = await httpClient(`v1/clinic/recurring-expenses/due/?month=${month}`, { signal })
 */
export async function fetchDueMonth(month: CalendarMonth, signal?: AbortSignal): Promise<DueMonth> {
  const raw: unknown = await mockExpenseServer.due(month, signal)
  return toDueMonth(v.parse(dueMonthSchema, raw))
}

/**
 * ⚠️ Mock, as above. The real call:
 *
 *   const raw: unknown = await httpClient(`v1/clinic/payroll/?month=${month}`, { signal })
 */
export async function fetchPayroll(month: CalendarMonth, signal?: AbortSignal): Promise<Payroll> {
  const raw: unknown = await mockExpenseServer.payroll(month, signal)
  return toPayroll(v.parse(payrollSchema, raw))
}

/**
 * ⚠️ Mock, as above. The real call:
 *
 *   const raw: unknown = await httpClient(`v1/clinic/doctors/${doctorId}/compensation/`, { signal })
 */
export async function fetchCompensationHistory(
  doctorId: number,
  signal?: AbortSignal,
): Promise<Compensation[]> {
  const raw: unknown = await mockExpenseServer.compensationHistory(doctorId, signal)
  return v.parse(compensationListSchema, raw).map(toCompensation)
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

  recurring: (clinicId: number) =>
    queryOptions({
      queryKey: expenseKeys.recurring(clinicId),
      queryFn: ({ signal }) => fetchRecurringExpenses(signal),
      ...cachePolicy.financial,
    }),

  due: (clinicId: number, month: CalendarMonth) =>
    queryOptions({
      queryKey: expenseKeys.due(clinicId, month),
      queryFn: ({ signal }) => fetchDueMonth(month, signal),
      ...cachePolicy.financial,
      placeholderData: keepPreviousData,
    }),

  payroll: (clinicId: number, month: CalendarMonth) =>
    queryOptions({
      queryKey: expenseKeys.payroll(clinicId, month),
      queryFn: ({ signal }) => fetchPayroll(month, signal),
      ...cachePolicy.financial,
      placeholderData: keepPreviousData,
    }),

  compensation: (clinicId: number, doctorId: number) =>
    queryOptions({
      queryKey: expenseKeys.compensation(clinicId, doctorId),
      queryFn: ({ signal }) => fetchCompensationHistory(doctorId, signal),
      ...cachePolicy.financial,
    }),
}
