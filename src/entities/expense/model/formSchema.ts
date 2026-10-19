import * as v from 'valibot'
import { parseCalendarDate } from '@/shared/lib/calendarDate'
import { clinicNow } from '@/shared/lib/datetime'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_METHODS,
  type Expense,
  type ExpenseCategory,
  type ExpenseMethod,
} from './types'

/**
 * The writable shape of an expense. In the entity rather than a feature, so
 * create and edit share one definition without importing each other (§4).
 */

/** Digits only. Money is entered as whole so'm — no separators, no decimals. */
const DIGITS = /^\d+$/

/**
 * Above this a typo is far likelier than a real payment (an extra zero on rent).
 * The server keeps its own limit; this one only saves a round trip.
 */
export const EXPENSE_AMOUNT_MAX = 10_000_000_000

const PAYEE_MAX = 120
const NOTE_MAX = 500

export const expenseFormSchema = v.pipe(
  v.object({
    date: v.pipe(
      v.string(),
      v.minLength(1, 'validation.required'),
      v.check((value) => parseCalendarDate(value) !== null, 'validation.invalid'),
      // A payment that has not happened yet is not an expense. The clinic's
      // day, not the browser's (§14): before 05:00 the UTC day is yesterday.
      v.check((value) => value <= clinicNow().date, 'validation.futureDate'),
    ),
    category: v.pipe(
      v.picklist(['', ...EXPENSE_CATEGORIES]),
      v.check((value) => value !== '', 'validation.required'),
    ),
    amount: v.pipe(
      v.string(),
      v.trim(),
      v.minLength(1, 'validation.required'),
      v.check((value) => DIGITS.test(value) && Number(value) > 0, 'validation.invalid'),
      v.check((value) => Number(value) <= EXPENSE_AMOUNT_MAX, 'validation.tooLarge'),
    ),
    method: v.picklist(EXPENSE_METHODS),
    payee: v.pipe(v.string(), v.trim(), v.maxLength(PAYEE_MAX, 'validation.max_length')),
    note: v.pipe(v.string(), v.trim(), v.maxLength(NOTE_MAX, 'validation.max_length')),
    /** An `entities/doctor` id as a string; `''` when the category is not a doctor's share. */
    doctorId: v.string(),
  }),
  v.forward(
    v.partialCheck(
      [['category'], ['doctorId']],
      (input) => input.category !== 'doctor_share' || input.doctorId !== '',
      'validation.required',
    ),
    ['doctorId'],
  ),
)

export type ExpenseFormInput = v.InferOutput<typeof expenseFormSchema>

export function emptyExpenseForm(): ExpenseFormInput {
  return {
    date: clinicNow().date,
    category: '',
    amount: '',
    method: 'cash',
    payee: '',
    note: '',
    doctorId: '',
  }
}

export function toExpenseForm(expense: Expense): ExpenseFormInput {
  return {
    date: expense.date,
    category: expense.category,
    amount: String(expense.amount),
    method: expense.method,
    payee: expense.payee ?? '',
    note: expense.note ?? '',
    doctorId: expense.doctorId === null ? '' : String(expense.doctorId),
  }
}

export interface ExpensePayload {
  date: string
  category: ExpenseCategory
  amount: number
  method: ExpenseMethod
  payee: string | null
  note: string | null
  doctor: number | null
}

/** Only call with a validated form: `category` is non-empty by then. */
export function toExpensePayload(input: ExpenseFormInput): ExpensePayload {
  const category = input.category === '' ? 'other' : input.category
  return {
    date: input.date,
    category,
    amount: Number(input.amount),
    method: input.method,
    payee: input.payee === '' ? null : input.payee,
    note: input.note === '' ? null : input.note,
    // A doctor left over from switching category away is not sent.
    doctor: category === 'doctor_share' && input.doctorId !== '' ? Number(input.doctorId) : null,
  }
}

const SERVER_FIELD_NAMES: Record<string, keyof ExpenseFormInput> = {
  date: 'date',
  category: 'category',
  amount: 'amount',
  method: 'method',
  payee: 'payee',
  note: 'note',
  doctor: 'doctorId',
}

/** The inverse, for putting a server error back on the input that caused it (§10). */
export function expenseFormFieldOf(serverField: string): keyof ExpenseFormInput | 'root' {
  return SERVER_FIELD_NAMES[serverField] ?? 'root'
}

/** Why an entry is being voided — required, so the journal can answer "what happened here?". */
export const voidExpenseFormSchema = v.object({
  reason: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(3, 'validation.tooShort'),
    v.maxLength(200, 'validation.max_length'),
  ),
})

export type VoidExpenseFormInput = v.InferOutput<typeof voidExpenseFormSchema>
