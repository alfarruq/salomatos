import * as v from 'valibot'

/**
 * §10 — messages are translation keys, not text. There are four locales
 * (ADR-008) and the schema has no idea which one is active.
 *
 * The identifier is a **username**, not an email: `UserLoginSerializer` takes
 * `username`, and `User.USERNAME_FIELD` is `username`. Email exists on the
 * model but is nullable and not what authentication looks at, so validating
 * this as an email address would reject valid credentials.
 */
export const loginSchema = v.object({
  username: v.pipe(v.string(), v.trim(), v.minLength(1, 'validation.required')),
  password: v.pipe(v.string(), v.minLength(1, 'validation.required')),
})

export type LoginInput = v.InferOutput<typeof loginSchema>
