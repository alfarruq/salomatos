import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { paymentFormSchema, toPaymentPayload } from './formSchema'

const today = '2026-10-29'

describe('paymentFormSchema', () => {
  const schema = paymentFormSchema(500_000, '2026-10-01')

  it('accepts up to what is still owed', () => {
    expect(v.safeParse(schema, { date: today, amount: '500000', note: '' }).success).toBe(true)
  })

  it('refuses more than is owed, and a date before the treatment', () => {
    const over = v.safeParse(schema, { date: today, amount: '500001', note: '' })
    expect(over.issues?.[0]?.message).toBe('validation.exceeds_debt')

    const early = v.safeParse(schema, { date: '2026-09-30', amount: '1000', note: '' })
    expect(early.issues?.[0]?.message).toBe('validation.before_treatment_start')
  })
})

describe('toPaymentPayload', () => {
  it('sends numbers and a null note', () => {
    expect(toPaymentPayload(7, { date: today, amount: '1000', note: '' })).toEqual({
      treatment: 7,
      amount: 1000,
      date: today,
      note: null,
    })
  })
})
