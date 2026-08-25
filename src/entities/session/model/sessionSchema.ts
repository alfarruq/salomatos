import * as v from 'valibot'
import { permissionsForRole } from './permissions'
import type { Session } from './types'

/**
 * The wire contract for `/api/me/`, validated at runtime.
 *
 * ADR-006 (revised): there are no generated types to lean on. The backend
 * serves drf-yasg, which emits Swagger 2.0 rather than the OpenAPI 3 Orval
 * wants, and registers the schema route only under `DEBUG`. So this schema is
 * not a stopgap ahead of generation — it *is* the contract, and the only place
 * a serializer change gets caught.
 *
 * It is deliberately strict about `full_name` and `role` and permissive about
 * everything else, because those two are the fields the interface cannot do
 * without: one names the user, the other decides what they are shown.
 */

const nullableString = v.nullable(v.string())

export const meResponseSchema = v.object({
  full_name: v.pipe(v.string(), v.minLength(1)),
  role: v.picklist(['superadmin', 'admin', 'doctor', 'patient']),
  phone_number: nullableString,
  email: nullableString,
  specialty: nullableString,
  biography: nullableString,
  /** A relative media path, not a URL. Absent for most accounts. */
  image: nullableString,
  experience: v.nullable(v.number()),
})

export type MeResponse = v.InferOutput<typeof meResponseSchema>

/**
 * Maps the wire shape to the domain shape (§3.1's `model/mapper`).
 *
 * `userId` comes from the caller rather than the response because the response
 * does not contain one — `UserMeSerializer` lists eight fields and `id` is not
 * among them. It is read from the access token instead (`fetchSession`).
 */
export function toSession(response: MeResponse, userId: number): Session {
  return {
    userId,
    // Same value, different meaning — see the field's comment in `types.ts`.
    clinicId: userId,
    fullName: response.full_name,
    phoneNumber: response.phone_number,
    email: response.email,
    role: response.role,
    specialty: response.specialty,
    permissions: permissionsForRole(response.role),
  }
}

export function parseSession(raw: unknown, userId: number): Session {
  return toSession(v.parse(meResponseSchema, raw), userId)
}
