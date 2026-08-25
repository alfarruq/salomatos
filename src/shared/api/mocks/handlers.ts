import { HttpResponse, http } from 'msw'
import { PAGE_SIZE } from '@/shared/api/pagination'
import { readJwtPayload } from '@/shared/lib/jwt'
import {
  accessTokenFor,
  errorEnvelope,
  MOCK_PASSWORD,
  MOCK_PATIENT_DETAILS,
  MOCK_PATIENTS,
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

export const handlers = [
  /**
   * §9 — the only thing that says who the user is. Note what it does *not*
   * return: no id, no clinic, no permissions. That absence is the reason the
   * tenant id is read from the token instead.
   */
  http.get('/api/me/', ({ request }) => {
    const user = authenticate(request)
    if (user === null) return unauthorized()

    const { id: _id, username: _username, ...serialized } = MOCK_USERS[user]
    return HttpResponse.json(serialized)
  }),

  http.post('/api/login/', async ({ request }) => {
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
  http.get('/api/patients/', ({ request }) => {
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
      next: start + PAGE_SIZE < matched.length ? `/api/patients/?page=${page + 1}` : null,
      previous: page > 1 ? `/api/patients/?page=${page - 1}` : null,
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
  http.post('/api/patients/', async ({ request }) => {
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
      doctor: null,
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
  http.patch('/api/patients/:patientId/', async ({ request, params }) => {
    if (authenticate(request) === null) return unauthorized()

    const id = Number(params['patientId'])
    const existing = MOCK_PATIENTS.find((patient) => patient.id === id)
    if (existing === undefined) return new HttpResponse(null, { status: 404 })

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    return HttpResponse.json({ ...existing, ...body })
  }),

  http.get('/api/patients/:patientId/', ({ request, params }) => {
    if (authenticate(request) === null) return unauthorized()

    const detail = MOCK_PATIENT_DETAILS[Number(params['patientId'])]
    if (detail === undefined) {
      // `drf_exception_handler` answers Http404 with no body at all.
      return new HttpResponse(null, { status: 404 })
    }

    return HttpResponse.json(detail)
  }),
]
