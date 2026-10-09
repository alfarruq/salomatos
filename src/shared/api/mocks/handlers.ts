import { HttpResponse, http } from 'msw'
import { PAGE_SIZE } from '@/shared/api/pagination'
import { clinicNow } from '@/shared/lib/datetime'
import { readJwtPayload } from '@/shared/lib/jwt'
import {
  accessTokenFor,
  errorEnvelope,
  MOCK_APPOINTMENTS,
  MOCK_DOCTOR_TYPES,
  MOCK_DOCTORS,
  MOCK_PASSWORD,
  MOCK_PATIENT_DETAILS,
  MOCK_PATIENTS,
  MOCK_RECIPES,
  MOCK_TREATMENT_TYPES,
  MOCK_TREATMENTS,
  MOCK_USERS,
  type MockUserKey,
} from './fixtures'

/**
 * Stands in for the Django backend in tests and in `VITE_USE_MOCKS` runs.
 *
 * These handlers reproduce the contract as it actually is: bearer tokens in the
 * `Authorization` header, tokens returned in the login *body*, the shared error
 * envelope, and no logout or refresh route — because the server has neither.
 *
 * ⛔ No `X-Request-Id` header, deliberately: the backend does not send one, and
 * a mock that supplied it would let code depend on something absent in
 * production.
 */

function authenticate(request: Request): MockUserKey | null {
  const header = request.headers.get('Authorization')
  if (header === null || !header.startsWith('Bearer ')) return null

  const payload = readJwtPayload(header.slice('Bearer '.length))
  if (payload === null) return null

  return (
    (Object.keys(MOCK_USERS) as MockUserKey[]).find(
      (key) => MOCK_USERS[key].id === payload.userId,
    ) ?? null
  )
}

const unauthorized = () =>
  HttpResponse.json(
    errorEnvelope({
      message: 'Given token not valid for any token type',
      messageKey: 'unauthorized',
      exceptionClass: 'InvalidToken',
    }),
    { status: 401 },
  )

/**
 * `DoctorCreateUpdateSerializer.doctor_type` writes an id (`PrimaryKeyRelated
 * Field`, since it is a plain `ModelSerializer` field); `DoctorListSerializer.
 * doctor_type` reads back a name (`CharField()` with no `source`, so it
 * serialises the FK's own `__str__`). A mock that echoed the id it was given
 * would look like it worked and then show a number where a name belongs.
 */
function doctorTypeNameFor(rawId: unknown): string | null {
  const id = Number(rawId)
  if (rawId === null || rawId === undefined || Number.isNaN(id)) return null
  return MOCK_DOCTOR_TYPES.find((doctorType) => doctorType.id === id)?.name ?? null
}

/** Same id-in, name-out pair confirmed for `doctor`/`doctor_id` on `/calendars/appointments/`. */
function doctorNameFor(rawId: unknown): string | null {
  const id = Number(rawId)
  if (rawId === null || rawId === undefined || Number.isNaN(id)) return null
  return MOCK_DOCTORS.find((doctor) => doctor.id === id)?.full_name ?? null
}

/** Same pair as `doctorNameFor`, for `patient`/`patient_id`. */
function patientNameFor(rawId: unknown): string | null {
  const id = Number(rawId)
  if (rawId === null || rawId === undefined || Number.isNaN(id)) return null
  return MOCK_PATIENTS.find((patient) => patient.id === id)?.full_name ?? null
}

function idOf(rawId: unknown): number | null {
  const id = Number(rawId)
  return rawId === null || rawId === undefined || Number.isNaN(id) ? null : id
}

/** DRF's `TimeField` always answers with seconds, even when the client sent none. */
function withSeconds(rawTime: unknown): string {
  const time = typeof rawTime === 'string' ? rawTime : ''
  return time.length === 5 ? `${time}:00` : time
}

export const handlers = [
  /**
   * §9 — the only thing that says who the user is. Note what it does *not*
   * return: no id, no clinic, no permissions. That absence is the reason the
   * tenant id is read from the token instead.
   */
  http.get('/api/v1/authentication/me/', ({ request }) => {
    const user = authenticate(request)
    if (user === null) return unauthorized()

    const { id: _id, username: _username, ...serialized } = MOCK_USERS[user]
    return HttpResponse.json(serialized)
  }),

  http.post('/api/v1/authentication/login/', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      username?: string
      password?: string
    }

    const match = (Object.keys(MOCK_USERS) as MockUserKey[]).find(
      (key) => MOCK_USERS[key].username === body.username,
    )

    if (match === undefined || body.password !== MOCK_PASSWORD) {
      return HttpResponse.json(
        errorEnvelope({
          message: 'Invalid username or password',
          messageKey: 'invalid_username_or_password',
          exceptionClass: 'ValidationError',
        }),
        { status: 400 },
      )
    }

    // `UserService.login` wraps the tokens in the default response serializer.
    return HttpResponse.json({
      message: 'Ok',
      result: {
        access_token: accessTokenFor(match),
        refresh_token: `refresh-${match}`,
      },
    })
  }),

  /**
   * `PatientService.get_patients` — filtered, then paginated.
   *
   * The `search` filter is `full_name__icontains`, which is why it arrives as a
   * query parameter and why nginx must not log query strings (§13.4). Repeated
   * here rather than simplified, so a test that checks searching is checking
   * the thing the server actually does.
   */
  http.get('/api/v1/clinic/patients/', ({ request }) => {
    if (authenticate(request) === null) return unauthorized()

    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase() ?? ''
    const status = url.searchParams.get('status')
    const doctor = url.searchParams.get('doctor')?.toLowerCase() ?? ''
    const page = Number(url.searchParams.get('page') ?? '1')

    const matched = MOCK_PATIENTS.filter((patient) => {
      if (search !== '' && !patient.full_name.toLowerCase().includes(search)) return false
      if (status !== null && patient.status !== status) return false
      if (doctor !== '' && !(patient.doctor?.toLowerCase().includes(doctor) ?? false)) return false
      return true
    })

    const start = (page - 1) * PAGE_SIZE
    const results = matched.slice(start, start + PAGE_SIZE)

    return HttpResponse.json({
      count: matched.length,
      next: start + PAGE_SIZE < matched.length ? `/api/v1/clinic/patients/?page=${page + 1}` : null,
      previous: page > 1 ? `/api/v1/clinic/patients/?page=${page - 1}` : null,
      results,
    })
  }),

  /**
   * `PatientService.create_patient` — answers with the *list* serializer.
   *
   * The rejection reproduced here is `unique_phone_per_clinic`, the constraint
   * a receptionist actually hits: registering someone who is already on file.
   * DRF reports it as the code `unique`, not as a sentence.
   */
  http.post('/api/v1/clinic/patients/', async ({ request }) => {
    if (authenticate(request) === null) return unauthorized()

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const phone = typeof body['phone_number'] === 'string' ? body['phone_number'] : ''

    if (MOCK_PATIENTS.some((patient) => patient.phone_number === phone)) {
      return HttpResponse.json(
        errorEnvelope({
          message: 'Validation error',
          messageKey: 'validation_error',
          errors: { phone_number: 'unique' },
          exceptionClass: 'ValidationError',
        }),
        { status: 400 },
      )
    }

    return HttpResponse.json({
      id: 999,
      full_name: body['full_name'] ?? '',
      phone_number: phone,
      appointment_date: null,
      treatment_type: null,
      status: null,
      // Written as an id (`doctor`), read back as a name — same list-serializer
      // shape confirmed on `/clinic/doctors/` and `/clinic/treatment-types/`.
      doctor: doctorNameFor(body['doctor']),
      remaining: null,
      total_remaining: 0,
      birth_date: body['birth_date'] ?? null,
      address: body['address'] ?? null,
      office: body['office'] ?? null,
    })
  }),

  /**
   * `PatientService.update_patient`, **as it is meant to work**.
   *
   * ⚠️ The real endpoint raises `TypeError` on every call — `get_patient` is
   * invoked without its `user` argument. Reproducing that bug here would mean
   * writing client code against a defect instead of a contract; the mismatch is
   * documented on `useUpdatePatient` instead.
   */
  http.patch('/api/v1/clinic/patients/:patientId/', async ({ request, params }) => {
    if (authenticate(request) === null) return unauthorized()

    const id = Number(params['patientId'])
    const existing = MOCK_PATIENTS.find((patient) => patient.id === id)
    if (existing === undefined) return new HttpResponse(null, { status: 404 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const updated: Record<string, unknown> = { ...existing, ...body }
    if ('doctor' in body) updated['doctor'] = doctorNameFor(body['doctor'])

    return HttpResponse.json(updated)
  }),

  http.delete('/api/v1/clinic/patients/:patientId/', ({ request, params }) => {
    if (authenticate(request) === null) return unauthorized()

    const id = Number(params['patientId'])
    const existing = MOCK_PATIENTS.find((patient) => patient.id === id)
    if (existing === undefined) return new HttpResponse(null, { status: 404 })

    return new HttpResponse(null, { status: 204 })
  }),

  /** `DoctorService.get_doctor_types` — a plain array, not a page. */
  http.get('/api/v1/clinic/doctors/types/', ({ request }) => {
    if (authenticate(request) === null) return unauthorized()
    return HttpResponse.json(MOCK_DOCTOR_TYPES)
  }),

  http.post('/api/v1/clinic/doctors/types/', async ({ request }) => {
    if (authenticate(request) === null) return unauthorized()

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    return HttpResponse.json({ id: 700, name: body['name'] ?? 'Stomatolog' })
  }),

  http.patch('/api/v1/clinic/doctors/types/:id/', async ({ request, params }) => {
    if (authenticate(request) === null) return unauthorized()

    const id = Number(params['id'])
    const existing = MOCK_DOCTOR_TYPES.find((doctorType) => doctorType.id === id)
    if (existing === undefined) return new HttpResponse(null, { status: 404 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    return HttpResponse.json({ ...existing, ...body })
  }),

  http.delete('/api/v1/clinic/doctors/types/:id/', ({ request, params }) => {
    if (authenticate(request) === null) return unauthorized()

    const id = Number(params['id'])
    const existing = MOCK_DOCTOR_TYPES.find((doctorType) => doctorType.id === id)
    if (existing === undefined) return new HttpResponse(null, { status: 404 })

    return new HttpResponse(null, { status: 204 })
  }),

  /** `TreatmentTypeService.get_treatment_types` — paginated, like patients. */
  http.get('/api/v1/clinic/treatment-types/', ({ request }) => {
    if (authenticate(request) === null) return unauthorized()
    return HttpResponse.json({
      count: MOCK_TREATMENT_TYPES.length,
      next: null,
      previous: null,
      results: MOCK_TREATMENT_TYPES,
    })
  }),

  http.post('/api/v1/clinic/treatment-types/', async ({ request }) => {
    if (authenticate(request) === null) return unauthorized()

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    // The id the client sent, translated to a name — create/update answer with
    // the list serializer, same as `doctor_type` on `/clinic/doctors/`.
    const doctorType = MOCK_DOCTOR_TYPES.find((type) => type.id === body['doctor_type'])
    return HttpResponse.json({
      id: 800,
      name: body['name'] ?? '',
      price: body['price'] ?? null,
      doctor_type: doctorType?.name ?? null,
    })
  }),

  http.patch('/api/v1/clinic/treatment-types/:id/', async ({ request, params }) => {
    if (authenticate(request) === null) return unauthorized()

    const id = Number(params['id'])
    const existing = MOCK_TREATMENT_TYPES.find((service) => service.id === id)
    if (existing === undefined) return new HttpResponse(null, { status: 404 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const patch: Record<string, unknown> = { ...body }
    if ('doctor_type' in patch) {
      const doctorType = MOCK_DOCTOR_TYPES.find((type) => type.id === patch['doctor_type'])
      patch['doctor_type'] = doctorType?.name ?? null
    }
    return HttpResponse.json({ ...existing, ...patch })
  }),

  http.delete('/api/v1/clinic/treatment-types/:id/', ({ request, params }) => {
    if (authenticate(request) === null) return unauthorized()

    const id = Number(params['id'])
    const existing = MOCK_TREATMENT_TYPES.find((service) => service.id === id)
    if (existing === undefined) return new HttpResponse(null, { status: 404 })

    return new HttpResponse(null, { status: 204 })
  }),

  /** `UserService.update` — the clinic's own record. */
  http.patch('/api/v1/authentication/update/:userId/', async ({ request }) => {
    if (authenticate(request) === null) return unauthorized()

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    return HttpResponse.json(body)
  }),

  /**
   * `ClinicService.get_clinics` — a plain array filtered to the caller's own
   * clinic, and, like every list here, `many=True` behind a schema that shows
   * a single object. Empty by default: the account has not set one up yet,
   * the more useful default state to develop the "first-time setup" screen
   * against.
   */
  http.get('/api/v1/clinic/', ({ request }) => {
    if (authenticate(request) === null) return unauthorized()
    return HttpResponse.json([])
  }),

  http.post('/api/v1/clinic/', async ({ request }) => {
    if (authenticate(request) === null) return unauthorized()

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    // `ClinicListSerializer` — note what it does not have: an id. Neither does
    // this response, on purpose; see `entities/clinic/model/schema.ts`.
    return HttpResponse.json({
      name: body['name'] ?? '',
      phone_number: body['phone_number'] ?? '',
      address: body['address'] ?? '',
      logo: null,
      working_hours: body['working_hours'] ?? null,
    })
  }),

  /** `DoctorService.get_doctors` — a plain array, not a page. */
  http.get('/api/v1/clinic/doctors/', ({ request }) => {
    if (authenticate(request) === null) return unauthorized()
    return HttpResponse.json(MOCK_DOCTORS)
  }),

  http.post('/api/v1/clinic/doctors/', async ({ request }) => {
    if (authenticate(request) === null) return unauthorized()

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const phone = typeof body['phone_number'] === 'string' ? body['phone_number'] : ''

    if (MOCK_DOCTORS.some((doctor) => doctor.phone_number === phone)) {
      return HttpResponse.json(
        errorEnvelope({
          message: 'Validation error',
          messageKey: 'validation_error',
          errors: { phone_number: 'unique' },
          exceptionClass: 'ValidationError',
        }),
        { status: 400 },
      )
    }

    // The server assigns role and clinic itself.
    return HttpResponse.json({
      id: 900,
      full_name: body['full_name'] ?? '',
      phone_number: phone,
      email: body['email'] ?? null,
      // Written as an id (`doctor_type`), read back as a name — the list
      // serializer has no `source` and reports the FK's own `__str__`.
      doctor_type: doctorTypeNameFor(body['doctor_type']),
    })
  }),

  http.patch('/api/v1/clinic/doctors/:doctorId/', async ({ request, params }) => {
    if (authenticate(request) === null) return unauthorized()

    const id = Number(params['doctorId'])
    const existing = MOCK_DOCTORS.find((doctor) => doctor.id === id)
    if (existing === undefined) return new HttpResponse(null, { status: 404 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const updated: Record<string, unknown> = { ...existing, ...body }
    // Same id-in, name-out translation as create — otherwise a saved
    // assignment would echo back as the raw id instead of what the server
    // actually returns.
    if ('doctor_type' in body) updated['doctor_type'] = doctorTypeNameFor(body['doctor_type'])

    return HttpResponse.json(updated)
  }),

  http.get('/api/v1/clinic/patients/:patientId/', ({ request, params }) => {
    if (authenticate(request) === null) return unauthorized()

    const detail = MOCK_PATIENT_DETAILS[Number(params['patientId'])]
    if (detail === undefined) {
      // `drf_exception_handler` answers Http404 with no body at all.
      return new HttpResponse(null, { status: 404 })
    }

    return HttpResponse.json(detail)
  }),

  /**
   * `GalleryCreateUpdate` — confirmed against the real backend (see
   * `features/patient-gallery-upload`): `user` is the patient's own id
   * despite the name, and the file itself is the only other field. The one
   * handler in this file reading `request.formData()` instead of
   * `request.json()`, since the real endpoint only parses multipart.
   *
   * Stateless like every other create handler here (`/clinic/patients/`,
   * `/clinic/doctors/`): it does not push onto `MOCK_PATIENT_DETAILS`, whose
   * entries are shared across every test in the run.
   */
  http.post('/api/v1/clinic/galleries/', async ({ request }) => {
    if (authenticate(request) === null) return unauthorized()

    const form = await request.formData()
    const userId = Number(form.get('user'))

    if (!Number.isInteger(userId) || MOCK_PATIENT_DETAILS[userId] === undefined) {
      return HttpResponse.json(
        errorEnvelope({
          message: 'Invalid input.',
          messageKey: 'invalid',
          exceptionClass: 'ValidationError',
          errors: { user: 'does_not_exist' },
        }),
        { status: 400 },
      )
    }

    const file = form.get('image')
    return HttpResponse.json({
      id: 999,
      image: file instanceof File ? `/media/gallery/${file.name}` : null,
      created_at: new Date().toISOString(),
    })
  }),

  /**
   * `TreatmentList`, filtered by `patient_id` — in DRF's page envelope, as the
   * live endpoint answered on 2026-10-07. One page: no fixture has ten rows.
   */
  http.get('/api/v1/clinic/treatments/', ({ request }) => {
    if (authenticate(request) === null) return unauthorized()

    const patientId = Number(new URL(request.url).searchParams.get('patient_id'))
    const results = MOCK_TREATMENTS[patientId] ?? []
    return HttpResponse.json({ count: results.length, next: null, previous: null, results })
  }),

  /** 204 with no body, confirmed live. Stateless, like every other write here. */
  http.delete('/api/v1/clinic/treatments/:treatmentId/', ({ request, params }) => {
    if (authenticate(request) === null) return unauthorized()

    const id = Number(params['treatmentId'])
    const exists = Object.values(MOCK_TREATMENTS).some((rows) =>
      rows.some((row) => (row as { id: number }).id === id),
    )
    return exists
      ? new HttpResponse(null, { status: 204 })
      : new HttpResponse(null, { status: 404 })
  }),

  /** `RecipeList` — a plain array, filtered by the `patient_id` query param. */
  http.get('/api/v1/core/recipes/', ({ request }) => {
    if (authenticate(request) === null) return unauthorized()

    const patientId = Number(new URL(request.url).searchParams.get('patient_id'))
    return HttpResponse.json(MOCK_RECIPES[patientId] ?? [])
  }),

  /**
   * One object in, one object out — confirmed live on 2026-10-07, names in
   * place of the `patient`/`doctor` ids. Stateless, like every other write here.
   */
  http.post('/api/v1/core/recipes/', async ({ request }) => {
    if (authenticate(request) === null) return unauthorized()

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const medicines = Array.isArray(body['medicines']) ? (body['medicines'] as unknown[]) : []
    if (medicines.length === 0) {
      return HttpResponse.json(
        { message: 'Validation error', errors: { medicines: ['This field is required.'] } },
        { status: 400 },
      )
    }
    return HttpResponse.json({
      id: 900,
      patient: patientNameFor(body['patient']),
      doctor: doctorNameFor(body['doctor']),
      notes: body['notes'] ?? '',
      clinic: null,
      created_at: '2026-10-07T09:00:00Z',
      medicines: medicines.map((medicine, index) => ({
        id: 900 + index,
        ...(medicine as Record<string, unknown>),
      })),
    })
  }),

  /**
   * `CalendarService.get_appointments` — confirmed shape, see
   * `entities/appointment/model/schema.ts`. Mocked as a plain array: the
   * endpoint answers for one day or one week at a time, which is a bounded
   * slice rather than the kind of catalog `/clinic/treatment-types/` turned
   * out to paginate (still unconfirmed either way).
   */
  http.get('/api/v1/calendars/appointments/', ({ request }) => {
    if (authenticate(request) === null) return unauthorized()

    const raw = new URL(request.url).searchParams.get('date')
    // `day` is the server's own "today", confirmed live.
    const date = raw === 'day' ? clinicNow().date : raw
    const matched =
      date === 'week' || date === null
        ? MOCK_APPOINTMENTS
        : MOCK_APPOINTMENTS.filter((appointment) => appointment.date === date)

    return HttpResponse.json(matched)
  }),

  http.post('/api/v1/calendars/appointments/', async ({ request }) => {
    if (authenticate(request) === null) return unauthorized()

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    // Confirmed against a real 400: unlike `patient`, `doctor` is required.
    if (body['doctor'] === null || body['doctor'] === undefined) {
      return HttpResponse.json(
        errorEnvelope({
          message: 'Invalid input.',
          messageKey: 'invalid',
          errors: { doctor: 'null' },
          exceptionClass: 'ValidationError',
        }),
        { status: 400 },
      )
    }

    const patientId = idOf(body['patient'])
    return HttpResponse.json({
      id: 900,
      patient_id: patientId,
      // No `full_name` on read: a linked patient's own name wins, and an
      // unlinked walk-in falls back to what was typed — confirmed shape.
      patient: patientNameFor(patientId) ?? body['full_name'] ?? null,
      phone_number: body['phone_number'] ?? null,
      doctor_id: idOf(body['doctor']),
      doctor: doctorNameFor(body['doctor']),
      // Confirmed against a real response: sent back even though the form
      // never submits it.
      treatment_type: null,
      date: body['date'] ?? '',
      time: withSeconds(body['time']),
      notes: body['notes'] ?? null,
      status: body['status'] ?? 'in_progress',
    })
  }),

  http.patch('/api/v1/calendars/appointments/:id/', async ({ request, params }) => {
    if (authenticate(request) === null) return unauthorized()

    const id = Number(params['id'])
    const existing = MOCK_APPOINTMENTS.find((appointment) => appointment.id === id)
    if (existing === undefined) return new HttpResponse(null, { status: 404 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const updated: Record<string, unknown> = { ...existing, ...body }
    if ('patient' in body) {
      const patientId = idOf(body['patient'])
      updated['patient_id'] = patientId
      updated['patient'] = patientNameFor(patientId) ?? body['full_name'] ?? existing.patient
    }
    if ('doctor' in body) {
      updated['doctor_id'] = idOf(body['doctor'])
      updated['doctor'] = doctorNameFor(body['doctor'])
    }
    if ('time' in body) updated['time'] = withSeconds(body['time'])

    return HttpResponse.json(updated)
  }),

  http.delete('/api/v1/calendars/appointments/:id/', ({ request, params }) => {
    if (authenticate(request) === null) return unauthorized()

    const id = Number(params['id'])
    const existing = MOCK_APPOINTMENTS.find((appointment) => appointment.id === id)
    if (existing === undefined) return new HttpResponse(null, { status: 404 })

    return new HttpResponse(null, { status: 204 })
  }),
]
