/**
 * Permissions the UI knows how to gate on (§9.2).
 *
 * The list is a closed union so a typo in `<Can permission="patinet:read">` is a
 * type error rather than a silently hidden button. The *values* still come from
 * `/api/me/` — the frontend never maps a role to permissions itself, because
 * then a backend change would make the frontend lie (§9.2).
 */
export type Permission =
  | 'patient:read'
  | 'patient:write'
  | 'patient:archive'
  | 'appointment:read'
  | 'appointment:write'
  | 'medical-record:read'
  | 'medical-record:write'
  | 'billing:read'
  | 'billing:write'
  | 'clinic:manage'
  | 'staff:manage'

/** Informational only. Never used to decide what a user may do. */
export type Role = 'SuperAdmin' | 'ClinicAdmin' | 'Doctor' | 'Patient'

export interface Clinic {
  id: string
  name: string
}

export interface Session {
  userId: string
  firstName: string
  lastName: string
  email: string
  role: Role
  /** A Set because the only question ever asked is "does it contain X?". */
  permissions: ReadonlySet<Permission>
  clinics: readonly Clinic[]
  /** Null while a user with no clinic is being onboarded. */
  activeClinicId: string | null
}

export function fullName(session: Pick<Session, 'firstName' | 'lastName'>): string {
  return `${session.firstName} ${session.lastName}`.trim()
}
