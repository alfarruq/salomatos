import * as v from 'valibot'
import type { Session } from '@/entities/session'

/**
 * The clinic's own record, as `UserUpdateSerializer` accepts it.
 *
 * A clinic is a `User` row here, so this is the user-update endpoint — which
 * is why the serializer also offers `specialty` and `experience`. Those are
 * doctor fields and are deliberately not shown: a clinic has no years of
 * experience, and an input that means nothing invites data that means nothing.
 *
 * `biography` is offered as a description, which is the one thing on that
 * serializer a clinic plausibly wants to write about itself.
 */

/** The national format, matching what `PhoneInput` emits. */
const UZ_PHONE = /^\+998\d{9}$/

export const clinicProfileSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(2, 'validation.tooShort')),
  phoneNumber: v.pipe(v.string(), v.regex(UZ_PHONE, 'validation.phoneUz')),
  email: v.pipe(
    v.string(),
    v.check(
      (value) => value === '' || v.is(v.pipe(v.string(), v.email()), value),
      'validation.email',
    ),
  ),
  description: v.string(),
})

export type ClinicProfileInput = v.InferOutput<typeof clinicProfileSchema>

/**
 * Fills the form from the session, which is the same record: `/me/` and the
 * update endpoint are two views of one `User` row.
 */
export function toClinicProfileForm(session: Session): ClinicProfileInput {
  return {
    name: session.fullName,
    phoneNumber: session.phoneNumber ?? '',
    email: session.email ?? '',
    description: '',
  }
}

export function toClinicProfilePayload(input: ClinicProfileInput): Record<string, string | null> {
  const orNull = (value: string): string | null => (value === '' ? null : value)

  return {
    full_name: input.name,
    phone_number: input.phoneNumber,
    email: orNull(input.email),
    biography: orNull(input.description),
  }
}

const SERVER_FIELD_NAMES: Record<string, keyof ClinicProfileInput> = {
  full_name: 'name',
  phone_number: 'phoneNumber',
  email: 'email',
  biography: 'description',
}

export function clinicProfileFieldOf(serverField: string): keyof ClinicProfileInput | 'root' {
  return SERVER_FIELD_NAMES[serverField] ?? 'root'
}
