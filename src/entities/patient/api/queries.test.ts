import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { resetApiContext } from '@/shared/api/httpContext'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { defaultPatientFilters } from '../model/types'
import { fetchPatient, fetchPatients, patientKeys } from './queries'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetApiContext()
  clearAccessToken()
})
afterAll(() => server.close())

describe('patientKeys', () => {
  it('puts the clinic inside every key', () => {
    /*
     * 🔴 §6.2. Without the tenant in the key, a second account signing in on
     * the same machine is served the first one's patients straight out of
     * memory. That is a data leak with legal consequences, not a display bug.
     */
    expect(patientKeys.scope(1)).toEqual(['clinics', 1, 'patients'])
    expect(patientKeys.detail(1, 101)).toEqual(['clinics', 1, 'patients', 'detail', 101])
    expect(patientKeys.list(1, defaultPatientFilters)).toEqual([
      'clinics',
      1,
      'patients',
      'list',
      defaultPatientFilters,
    ])
  })

  it('gives two clinics different keys for the same patient id', () => {
    expect(patientKeys.detail(1, 101)).not.toEqual(patientKeys.detail(2, 101))
  })
})

describe('fetchPatients', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('reads the page envelope and maps every row', async () => {
    const page = await fetchPatients(defaultPatientFilters)

    expect(page.count).toBe(3)
    expect(page.results).toHaveLength(3)
    expect(page.results[0]?.fullName).toBe('Vali Aliyev')
  })

  it('sends the search term to the server', async () => {
    const page = await fetchPatients({ ...defaultPatientFilters, search: 'nodira' })

    expect(page.count).toBe(1)
    expect(page.results[0]?.fullName).toBe('Nodira Karimova')
  })

  it('filters by treatment status', async () => {
    const page = await fetchPatients({ ...defaultPatientFilters, status: 'completed' })

    expect(page.results.map((patient) => patient.id)).toEqual([102])
  })

  it('omits parameters that are not set', async () => {
    let requested: string | undefined
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/api/patients/')) requested = request.url
    })

    await fetchPatients(defaultPatientFilters)

    // An empty `?search=` would be noise in the access log — which, for this
    // parameter, is the one place it must not appear.
    expect(requested).not.toContain('search=')
    expect(requested).not.toContain('page=')
  })

  it('refuses to serve patients without a token', async () => {
    clearAccessToken()

    await expect(fetchPatients(defaultPatientFilters)).rejects.toBeInstanceOf(ApiError)
  })
})

describe('fetchPatient', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('maps the detail shape, which is not the list shape', async () => {
    const patient = await fetchPatient(101)

    expect(patient.fullName).toBe('Vali Aliyev')
    expect(patient.visitNumber).toBe(3)
    expect(patient.totalTreatmentCost).toBe(4_000_000)
    expect(patient.treatments).toEqual([{ id: 7, name: 'Implantatsiya', toothNumber: 36 }])
  })

  it('handles a patient with no treatments at all', async () => {
    const patient = await fetchPatient(103)

    expect(patient.treatments).toEqual([])
    expect(patient.age).toBeNull()
    expect(patient.remaining).toBe(0)
  })

  it('reports a missing patient as notFound, not as a crash', async () => {
    // The server answers Http404 with an empty body; normalizeDrfError has to
    // survive that rather than trip over the absent envelope.
    await expect(fetchPatient(999)).rejects.toMatchObject({ kind: 'notFound' })
  })
})
