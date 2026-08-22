import * as v from 'valibot'

/**
 * §10 — messages are translation keys, not text. There are four locales
 * (ADR-008) and the schema has no idea which one is active.
 */
export const loginSchema = v.object({
  email: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'validation.required'),
    v.email('validation.email'),
  ),
  password: v.pipe(v.string(), v.minLength(1, 'validation.required')),
})

export type LoginInput = v.InferOutput<typeof loginSchema>
