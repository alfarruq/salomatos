import * as v from 'valibot'
import type { Permission, Session } from './types'

/**
 * The wire contract for `/api/me/`, validated at runtime.
 *
 * §5.1 says API types are generated, not hand-written, and they will be — this
 * schema is not a substitute for that. It answers a different question: does
 * the response actually match what we were promised?
 *
 * Right now that matters because the backend does not exist yet and this schema
 * *is* the specification. It keeps mattering afterwards: generated types are
 * compile-time only, so a serializer that quietly drops `permissions` would
 * otherwise surface as an empty sidebar rather than an error.
 *
 * ⚠️ When `pnpm api:generate` starts producing types, replace the field types
 * here with the generated ones and keep the parse.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// §5.4 requires UUIDs everywhere: sequential integer ids are open to
// enumeration (/patients/1, /patients/2, ...).
const uuid = v.pipe(v.string(), v.regex(UUID, 'expected a UUID'))

const clinicSchema = v.object({
  id: uuid,
  name: v.pipe(v.string(), v.minLength(1)),
})

export const sessionResponseSchema = v.object({
  id: uuid,
  first_name: v.string(),
  last_name: v.string(),
  email: v.string(),
  role: v.picklist(['SuperAdmin', 'ClinicAdmin', 'Doctor', 'Patient']),
  permissions: v.array(v.string()),
  clinics: v.array(clinicSchema),
  active_clinic_id: v.nullable(uuid),
})

export type SessionResponse = v.InferOutput<typeof sessionResponseSchema>

const KNOWN_PERMISSIONS: ReadonlySet<string> = new Set<Permission>([
  'patient:read',
  'patient:write',
  'patient:archive',
  'appointment:read',
  'appointment:write',
  'medical-record:read',
  'medical-record:write',
  'billing:read',
  'billing:write',
  'clinic:manage',
  'staff:manage',
])

/**
 * Maps the wire shape to the domain shape (§3.1's `model/mapper`).
 *
 * Unknown permissions are dropped rather than rejected: the backend may gain a
 * permission before this frontend deploys, and a UI that refuses to load
 * because it does not recognise a string would be a worse failure than one that
 * hides a button it does not know about yet.
 */
export function toSession(response: SessionResponse): Session {
  const permissions = new Set(
    response.permissions.filter((value): value is Permission => KNOWN_PERMISSIONS.has(value)),
  )

  return {
    userId: response.id,
    firstName: response.first_name,
    lastName: response.last_name,
    email: response.email,
    role: response.role,
    permissions,
    clinics: response.clinics,
    activeClinicId: response.active_clinic_id,
  }
}

export function parseSession(raw: unknown): Session {
  return toSession(v.parse(sessionResponseSchema, raw))
}
