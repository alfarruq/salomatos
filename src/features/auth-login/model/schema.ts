import { z } from 'zod'

/**
 * §10 — messages are translation keys, not text. There are four locales
 * (ADR-008) and the schema has no idea which one is active.
 */
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'validation.required').email('validation.email'),
  password: z.string().min(1, 'validation.required'),
})

export type LoginInput = z.infer<typeof loginSchema>
