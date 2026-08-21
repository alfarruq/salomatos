/**
 * Synthetic data only — §16.3 forbids real patient data in fixtures, and this
 * file is the reason that rule is easy to keep: there is one obvious place to
 * put made-up people.
 *
 * Shapes here are the **contract we are asking the backend for** (§5.4):
 * snake_case as DRF emits it, UUIDs for every id, ISO-8601 UTC for instants.
 * When `/api/schema/` exists, Orval replaces the types and these fixtures
 * become mocks generated from the schema instead. Until then, they are the
 * specification — keep them honest.
 */

export const CLINIC_A = {
  id: '4f7b2e91-3a5c-4d18-9f60-1c2a8b7d4e33',
  name: 'Salomat Dental — Chilonzor',
} as const

export const CLINIC_B = {
  id: '8c1d5a72-6b34-4e29-a1f7-9d0e3b6c5a48',
  name: 'Salomat Dental — Yunusobod',
} as const

/** Every permission the UI knows about (§9.2). */
export const ALL_PERMISSIONS = [
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
] as const

export const MOCK_USERS = {
  admin: {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    first_name: 'Dilnoza',
    last_name: 'Rahimova',
    email: 'admin@example.test',
    role: 'ClinicAdmin',
    permissions: [...ALL_PERMISSIONS],
    clinics: [CLINIC_A, CLINIC_B],
    active_clinic_id: CLINIC_A.id,
  },
  doctor: {
    id: 'a1b2c3d4-0000-4000-8000-000000000002',
    first_name: 'Sardor',
    last_name: 'Usmonov',
    email: 'doctor@example.test',
    role: 'Doctor',
    // A doctor sees patients and records but cannot archive or touch billing —
    // useful for exercising <Can> without inventing a scenario each time.
    permissions: [
      'patient:read',
      'appointment:read',
      'appointment:write',
      'medical-record:read',
      'medical-record:write',
    ],
    clinics: [CLINIC_A],
    active_clinic_id: CLINIC_A.id,
  },
} as const

export type MockUserKey = keyof typeof MOCK_USERS

/** Password for every mock account. Mock-only; nothing here reaches production. */
export const MOCK_PASSWORD = 'salomat'
