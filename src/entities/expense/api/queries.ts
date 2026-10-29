import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import { cachePolicy } from '@/shared/config/cache'
import type { ReportRange } from '@/shared/lib/report'
import {
  compensationListSchema,
  dueMonthSchema,
  expensePageSchema,
  expenseSummarySchema,
  myMonthSchema,
  payrollSchema,
  recurringExpenseListSchema,
  toCompensation,
  toDueMonth,
  toExpensePage,
  toExpenseSummary,
  toMyMonth,
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
  MyMonth,
  Payroll,
  RecurringExpense,
} from '../model/types'

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

  myMonth: (clinicId: number, month: CalendarMonth) =>
    [...expenseKeys.scope(clinicId), 'my-month', month] as const,
}

const init = (signal?: AbortSignal) => (signal === undefined ? {} : { signal })

export async function fetchExpenses(
  filters: ExpenseFilters,
  signal?: AbortSignal,
): Promise<ExpensePage> {
  const params = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    page: String(filters.page),
  })
  if (filters.category !== null) params.set('category', filters.category)
  const raw = await httpClient<unknown>(`v1/finance/expenses/?${params}`, init(signal))
  return toExpensePage(v.parse(expensePageSchema, raw))
}

export async function fetchExpenseSummary(
  range: ReportRange,
  signal?: AbortSignal,
): Promise<ExpenseSummary> {
  const params = new URLSearchParams({ from: range.from, to: range.to })
  const raw = await httpClient<unknown>(`v1/finance/expenses/summary/?${params}`, init(signal))
  return toExpenseSummary(v.parse(expenseSummarySchema, raw))
}

export async function fetchRecurringExpenses(signal?: AbortSignal): Promise<RecurringExpense[]> {
  const raw = await httpClient<unknown>('v1/finance/recurring-expenses/', init(signal))
  return v.parse(recurringExpenseListSchema, raw).map(toRecurringExpense)
}

export async function fetchDueMonth(month: CalendarMonth, signal?: AbortSignal): Promise<DueMonth> {
  const raw = await httpClient<unknown>(
    `v1/finance/recurring-expenses/due/?month=${month}`,
    init(signal),
  )
  return toDueMonth(v.parse(dueMonthSchema, raw))
}

export async function fetchPayroll(month: CalendarMonth, signal?: AbortSignal): Promise<Payroll> {
  const raw = await httpClient<unknown>(`v1/finance/payroll/?month=${month}`, init(signal))
  return toPayroll(v.parse(payrollSchema, raw))
}

export async function fetchCompensationHistory(
  doctorId: number,
  signal?: AbortSignal,
): Promise<Compensation[]> {
  const raw = await httpClient<unknown>(
    `v1/finance/doctors/${doctorId}/compensation/`,
    init(signal),
  )
  return v.parse(compensationListSchema, raw).map(toCompensation)
}

export async function fetchMyMonth(month: CalendarMonth, signal?: AbortSignal): Promise<MyMonth> {
  const raw = await httpClient<unknown>(`v1/finance/me/?month=${month}`, init(signal))
  return toMyMonth(v.parse(myMonthSchema, raw))
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

  myMonth: (clinicId: number, month: CalendarMonth) =>
    queryOptions({
      queryKey: expenseKeys.myMonth(clinicId, month),
      queryFn: ({ signal }) => fetchMyMonth(month, signal),
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
