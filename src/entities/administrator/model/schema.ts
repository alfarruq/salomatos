import * as v from 'valibot'
import type { Administrator } from './types'

/**
 * The wire contract for `/clinic/admins/` (`AdminListSerializer`), validated
 * at runtime (ADR-006). A plain array, like `/clinic/doctors/`.
 */

/** Absent or null both mean "nothing here" — see `sessionSchema` for why. */
const optionalString = v.optional(v.nullable(v.string()), null)

export const administratorSchema = v.object({
  id: v.pipe(v.number(), v.integer()),
  full_name: v.string(),
  username: optionalString,
  phone_number: optionalString,
  email: optionalString,
})

export const administratorListSchema = v.array(administratorSchema)

export type AdministratorResponse = v.InferOutput<typeof administratorSchema>

export function toAdministrator(response: AdministratorResponse): Administrator {
  return {
    id: response.id,
    fullName: response.full_name,
    username: response.username,
    phoneNumber: response.phone_number,
    email: response.email,
  }
}
