import { describe, expect, it } from 'vitest'
import { readJwtPayload } from './jwt'

function token(payload: unknown): string {
  const encode = (value: unknown): string => {
    // btoa only takes latin1, so the JSON is UTF-8 encoded first — the same
    // thing a real signer does, and what makes the non-ASCII case meaningful.
    const bytes = new TextEncoder().encode(JSON.stringify(value))
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

describe('readJwtPayload', () => {
  it('reads the claim simplejwt actually emits', () => {
    expect(readJwtPayload(token({ token_type: 'access', user_id: 42 }))).toEqual({ userId: 42 })
  })

  it('decodes base64url without padding', () => {
    // A payload whose base64 needs padding exercises the `padEnd` branch; a
    // non-ASCII claim exercises the UTF-8 decode.
    const value = token({ user_id: 7, name: "Dilnoza O'g'li", note: 'ы' })

    expect(value).not.toContain('=')
    expect(readJwtPayload(value)).toEqual({ userId: 7 })
  })

  it('returns null rather than throwing on anything unreadable', () => {
    expect(readJwtPayload('')).toBeNull()
    expect(readJwtPayload('not-a-token')).toBeNull()
    // Two segments, not three.
    expect(readJwtPayload('a.b')).toBeNull()
    expect(readJwtPayload('a.!!!not-base64!!!.c')).toBeNull()
  })

  it('accepts a claim the server sent as a string', () => {
    /*
     * simplejwt writes `user_id` straight from the pk and stringifies it in
     * some versions. Rejecting the string form meant the session could not be
     * built at all — and from the login form that looked like a wrong
     * password, which is how it went unnoticed.
     */
    expect(readJwtPayload(token({ user_id: '42' }))).toEqual({ userId: 42 })
  })

  it('refuses a payload without a usable user id', () => {
    expect(readJwtPayload(token({ token_type: 'access' }))).toBeNull()
    expect(readJwtPayload(token(null))).toBeNull()
    // Numeric, but not a whole number — not an id.
    expect(readJwtPayload(token({ user_id: 4.2 }))).toBeNull()
    expect(readJwtPayload(token({ user_id: '4.2' }))).toBeNull()
    expect(readJwtPayload(token({ user_id: 'abc' }))).toBeNull()
    // `Number('')` is 0, and an empty claim is not user zero.
    expect(readJwtPayload(token({ user_id: '' }))).toBeNull()
    expect(readJwtPayload(token({ user_id: '  ' }))).toBeNull()
  })
})
