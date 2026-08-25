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
    const result = v.safeParse(loginSchema, { username: 'chilonzor', password: 'salomat' })

    expect(result.success).toBe(true)
  })

  it('reports translation keys, not sentences', () => {
    // §10 — the schema does not know which of the four locales is active.
    expect(issueFor({ username: '', password: '' }, 'username')).toBe('validation.required')
    expect(issueFor({ username: 'chilonzor', password: '' }, 'password')).toBe(
      'validation.required',
    )
  })

  it('does not treat the identifier as an email address', () => {
    /*
     * `User.USERNAME_FIELD` is `username`, and the accounts in use are names
     * like "chilonzor". Validating this as an email would reject every real
     * credential the backend accepts.
     */
    expect(v.safeParse(loginSchema, { username: 'chilonzor', password: 'x' }).success).toBe(true)
  })

  it('trims before deciding the field is empty', () => {
    // Otherwise a stray space passes the required check and fails at the server.
    expect(issueFor({ username: '   ', password: 'x' }, 'username')).toBe('validation.required')
  })

  it('hands the trimmed value on', () => {
    const result = v.parse(loginSchema, { username: '  chilonzor  ', password: 'x' })

    expect(result.username).toBe('chilonzor')
  })
})
