import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { loginSchema } from './schema'

/** First message for a field, or undefined when the field is fine. */
function issueFor(input: unknown, field: string): string | undefined {
  const result = v.safeParse(loginSchema, input)
  if (result.success) return undefined

  return result.issues.find((issue) => issue.path?.[0]?.key === field)?.message
}

describe('loginSchema', () => {
  it('accepts a filled-in form', () => {
    const result = v.safeParse(loginSchema, { email: 'a@example.test', password: 'salomat' })

    expect(result.success).toBe(true)
  })

  it('reports translation keys, not sentences', () => {
    // §10 — the schema does not know which of the four locales is active.
    expect(issueFor({ email: '', password: '' }, 'email')).toBe('validation.required')
    expect(issueFor({ email: 'a@example.test', password: '' }, 'password')).toBe(
      'validation.required',
    )
    expect(issueFor({ email: 'not-an-email', password: 'x' }, 'email')).toBe('validation.email')
  })

  it('trims before deciding the field is empty', () => {
    // Otherwise a stray space passes the required check and fails at the server.
    expect(issueFor({ email: '   ', password: 'x' }, 'email')).toBe('validation.required')
  })

  it('hands the trimmed value on', () => {
    const result = v.parse(loginSchema, { email: '  a@example.test  ', password: 'x' })

    expect(result.email).toBe('a@example.test')
  })
})
