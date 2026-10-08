/**
 * Synthetic data only — §16.3 forbids real patient data in fixtures, and this
 * file is the reason that rule is easy to keep: there is one obvious place to
 * put made-up people.
 *
 * Shapes here mirror the **actual Django contract**, not the one the
 * architecture document asked for: integer ids (ADR-013), `full_name` as a
 * single field, lowercase roles, and the `{message, message_key, errors,
 * exception_class}` error envelope. Keep them honest — a mock that is kinder
 * than the server is worse than no mock, because it makes the code pass tests
 * it will fail in production.
 */

/**
 * A structurally valid, deliberately unsigned JWT.
 *
 * `readJwtPayload` only base64-decodes the payload — it cannot verify a
 * signature and says so — which is exactly why a fake one is enough here. The
 * `user_id` claim is what simplejwt emits and what the backend's
 * `CustomJwtAuthentication` reads.
 */
function fakeAccessToken(userId: number): string {
  const encode = (value: object): string =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const header = encode({ alg: 'HS256', typ: 'JWT' })
  const payload = encode({ token_type: 'access', user_id: userId })
  return `${header}.${payload}.not-a-real-signature`
}

export const MOCK_USERS = {
  /**
   * A clinic account. In this backend a clinic *is* a user row — `User.clinic`
   * points at a `superadmin` — so this account's own id is the tenant id that
   * patient and appointment queries hang off.
   */
  clinic: {
    id: 1,
    username: 'chilonzor',
    full_name: 'Dilnoza Rahimova',
    phone_number: '+998901112233',
    email: 'clinic@example.test',
    experience: null,
    biography: null,
    image: null,
    role: 'superadmin',
  },
  doctor: {
    id: 2,
    username: 'sardor',
    full_name: 'Sardor Usmonov',
    phone_number: '+998901112244',
    email: 'doctor@example.test',
    experience: 7,
    biography: null,
    image: null,
    role: 'doctor',
  },
  /**
   * A patient who can authenticate but must not get in.
   *
   * They exist because the backend makes them possible, not because the
   * product wants them: patients are rows in the same `User` table and the
   * login endpoint does not care what role a row has. The guard is what turns
   * them away, and a fixture is what keeps that guard honest.
   */
  patient: {
    id: 3,
    username: 'bemor',
    full_name: 'Vali Aliyev',
    phone_number: '+998901234567',
    email: null,
    experience: null,
    biography: null,
    image: null,
    role: 'patient',
  },
} as const

export type MockUserKey = keyof typeof MOCK_USERS

export function accessTokenFor(user: MockUserKey): string {
  return fakeAccessToken(MOCK_USERS[user].id)
}

/** Password for every mock account. Mock-only; nothing here reaches production. */
export const MOCK_PASSWORD = 'salomat'

/**
 * Invented patients, in the exact shape `PatientListSerializer` emits.
 *
 * Note what is being reproduced faithfully and why it looks wrong: `doctor` is
 * a bare name with no id, `appointment_date` is a **pre-formatted**
 * `dd.MM.yyyy HH:mm` string, and money is a plain integer count of so'm. A
 * kinder mock would hide exactly the awkward parts the UI has to cope with.
 */
export const MOCK_PATIENTS = [
  {
    id: 101,
    full_name: 'Vali Aliyev',
    phone_number: '+998901234567',
    appointment_date: '24.08.2026 14:30',
    treatment_type: 'Implantatsiya',
    status: 'in_progress',
    doctor: 'Sardor Usmonov',
    remaining: 1_200_000,
    total_remaining: 1_200_000,
    birth_date: '1988-03-12',
    address: 'Chilonzor 12',
    office: null,
  },
  {
    id: 102,
    full_name: 'Nodira Karimova',
    phone_number: '+998907654321',
    appointment_date: null,
    treatment_type: 'Tozalash',
    status: 'completed',
    doctor: 'Sardor Usmonov',
    remaining: 0,
    total_remaining: 0,
    birth_date: '1995-11-02',
    address: null,
    office: null,
  },
  {
    id: 103,
    full_name: 'Jasur Toshmatov',
    phone_number: '+998935550011',
    // A patient with nothing on record yet: every optional field absent.
    appointment_date: null,
    treatment_type: null,
    status: null,
    doctor: null,
    remaining: null,
    total_remaining: 0,
    birth_date: null,
    address: null,
    office: null,
  },
] as const

/** `PatientDetailSerializer` for the patients above, keyed by id. */
export const MOCK_PATIENT_DETAILS: Record<number, unknown> = {
  101: {
    id: 101,
    full_name: 'Vali Aliyev',
    phone_number: '+998901234567',
    doctor: 'Sardor Usmonov',
    address: 'Chilonzor 12',
    office: null,
    image: null,
    birth_date: '1988-03-12',
    age: 38,
    status: 'in_progress',
    total_treatment_cost: 4_000_000,
    total_paid: 2_800_000,
    remaining: 1_200_000,
    total_remaining: 1_200_000,
    visit_number: 3,
    treatment_type: [{ id: 7, name: 'Implantatsiya', tooth_number: 36 }],
    gallery: [
      { id: 1, image: '/media/gallery/before.jpg', created_at: '2026-08-20T09:15:00Z' },
      { id: 2, image: '/media/gallery/after.jpg', created_at: '2026-08-24T14:40:00Z' },
    ],
    recipe: [],
  },
  103: {
    id: 103,
    full_name: 'Jasur Toshmatov',
    phone_number: '+998935550011',
    doctor: null,
    address: null,
    office: null,
    image: null,
    birth_date: null,
    age: null,
    status: null,
    total_treatment_cost: 0,
    total_paid: 0,
    remaining: 0,
    total_remaining: 0,
    visit_number: 0,
    treatment_type: [],
    gallery: [],
    recipe: [],
  },
}

/**
 * `TreatmentList`, keyed by `patient_id` the way `/clinic/treatments/` filters
 * them. The handler wraps these in the page envelope the live endpoint sends.
 */
export const MOCK_TREATMENTS: Record<number, unknown[]> = {
  101: [
    {
      id: 1,
      patient: 'Vali Aliyev',
      patient_id: 101,
      doctor: 'Sardor Usmonov',
      treatment_type: 'Implantatsiya',
      total_treatment_cost: 4_000_000,
      total_paid: 2_800_000,
      remaining: '1200000',
      visit_number: 3,
      tooth_number: 36,
      start_date: '2026-08-20',
      notes: 'Implant o‘rnatildi, keyingi tashrif nazorat uchun.',
      status: 'in_progress',
    },
    {
      id: 2,
      patient: 'Vali Aliyev',
      patient_id: 101,
      doctor: 'Sardor Usmonov',
      treatment_type: 'Tozalash',
      total_treatment_cost: 250_000,
      total_paid: 250_000,
      remaining: '0',
      visit_number: 1,
      tooth_number: null,
      start_date: '2026-06-02',
      notes: '',
      status: 'completed',
    },
  ],
  103: [],
}

/**
 * `RecipeList`, keyed by `patient_id` the way `/core/recipes/` filters them.
 * A plain array on the wire, confirmed by a live create on 2026-10-07:
 * `dose`, `duration` and `minutes` are integers. Recipe 2 holds free text in
 * `type`/`frequency`/`meal`, the way a row written by another client could.
 */
export const MOCK_RECIPES: Record<number, unknown[]> = {
  101: [
    {
      id: 2,
      patient: 'Vali Aliyev',
      doctor: 'Sardor Usmonov',
      notes: '',
      clinic: 'Dilnoza Rahimova',
      created_at: '2026-08-20T09:30:00Z',
      medicines: [
        {
          id: 3,
          name: 'Amoksitsillin',
          dose: 1,
          type: 'Tabletka',
          frequency: 'Kuniga 2 marta',
          duration: 7,
          meal: 'Ovqatdan keyin',
          minutes: 0,
        },
      ],
    },
    {
      id: 1,
      patient: 'Vali Aliyev',
      doctor: 'Sardor Usmonov',
      notes: "Issiq ovqat iste'mol qilmang.",
      clinic: 'Dilnoza Rahimova',
      created_at: '2026-09-02T10:00:00Z',
      medicines: [
        {
          id: 1,
          name: 'Amoksiklav 625 mg',
          dose: 1,
          type: 'tablet',
          frequency: 'bid',
          duration: 5,
          meal: 'after',
          minutes: 30,
        },
        {
          id: 2,
          name: 'Xolisal gel',
          dose: 1,
          type: 'gel',
          frequency: 'tid',
          duration: 7,
          meal: 'none',
          minutes: 0,
        },
      ],
    },
  ],
  103: [],
}

/** The envelope `apps/core/exceptions.py` puts around every failure. */
export function errorEnvelope({
  message,
  messageKey,
  errors = {},
  exceptionClass = 'BaseAPIException',
}: {
  message: string
  messageKey: string
  errors?: Record<string, unknown>
  exceptionClass?: string
}) {
  return {
    message,
    message_key: messageKey,
    errors,
    exception_class: exceptionClass,
  }
}

/**
 * The clinic's doctors, in the shape `DoctorListSerializer` emits.
 *
 * A plain array on the wire — this endpoint does not paginate, unlike
 * patients. The published schema does not say so; the Python does.
 */
export const MOCK_DOCTORS = [
  {
    id: 2,
    full_name: 'Sardor Usmonov',
    phone_number: '+998901112244',
    email: 'doctor@example.test',
    // The server's own field is a name, not the id `MOCK_DOCTOR_TYPES` uses —
    // `DoctorListSerializer.doctor_type` has no `source`, so it serialises the
    // foreign key's `__str__`.
    doctor_type: 'Stomatolog',
  },
  {
    // Everything optional absent: a doctor added in a hurry at reception.
    id: 4,
    full_name: 'Malika Yusupova',
    phone_number: null,
    email: null,
    doctor_type: null,
  },
] as const

/**
 * The clinic's price list, as `TreatmentTypeListSerializer` emits each row.
 *
 * A name, like `MOCK_DOCTORS[].doctor_type` — confirmed against a real
 * response, which is what corrected the entity's earlier "it's the id" guess.
 */
export const MOCK_TREATMENT_TYPES = [
  { id: 7, name: 'Implantatsiya', price: 4_000_000, doctor_type: 'Stomatolog' },
  { id: 8, name: 'Tozalash', price: 250_000, doctor_type: 'Ortodont' },
  // Quoted per case — a real state, and not the same as free. Also unassigned.
  { id: 9, name: 'Ortodontik davolash', price: null, doctor_type: null },
] as const

/** The clinic's doctor categories, as `DoctorTypeListSerializer` emits them. */
export const MOCK_DOCTOR_TYPES = [
  { id: 5, name: 'Stomatolog' },
  { id: 6, name: 'Ortodont' },
] as const

/**
 * The clinic's schedule, as `/calendars/appointments/` actually emits it —
 * confirmed against a real response. There is no `full_name` field on read:
 * the display name comes back under `patient` alongside the real id in
 * `patient_id`, and `doctor`/`doctor_id` follow the same pair.
 */
export const MOCK_APPOINTMENTS = [
  {
    id: 501,
    patient_id: 101,
    patient: 'Vali Aliyev',
    phone_number: '+998901234567',
    doctor_id: 2,
    doctor: 'Sardor Usmonov',
    treatment_type: 'Implantatsiya',
    date: '2026-09-27',
    time: '09:30:00',
    notes: null,
    status: 'in_progress',
  },
  {
    // A walk-in — `patient_id` is null, but `patient` still carries the name
    // that was typed (unconfirmed for a real walk-in, see the entity schema).
    id: 502,
    patient_id: null,
    patient: 'Yangi Mijoz',
    phone_number: '+998907654321',
    doctor_id: 4,
    doctor: 'Malika Yusupova',
    treatment_type: null,
    date: '2026-09-27',
    time: '11:00:00',
    notes: 'Birinchi tashrif',
    status: 'in_progress',
  },
  {
    id: 503,
    patient_id: 102,
    patient: 'Nodira Karimova',
    phone_number: '+998907654321',
    doctor_id: null,
    doctor: null,
    treatment_type: 'Tozalash',
    date: '2026-09-28',
    time: '14:00:00',
    notes: null,
    status: 'completed',
  },
] as const
