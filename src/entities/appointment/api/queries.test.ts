import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { clinicNow } from '@/shared/lib/datetime'
import { fetchAppointmentPage, fetchAppointments } from './queries'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

describe('fetchAppointments', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('reads the fixture day', async () => {
    const appointments = await fetchAppointments({ view: 'day', date: '2026-09-27' })

    expect(appointments).toHaveLength(2)
    expect(appointments[0]).toEqual({
      id: 501,
      fullName: 'Vali Aliyev',
      phoneNumber: '+998901234567',
      patientId: 101,
      doctorId: 2,
      doctorName: 'Sardor Usmonov',
      treatmentTypeName: 'Implantatsiya',
      date: '2026-09-27',
      time: '09:30',
      notes: null,
      status: 'in_progress',
    })
  })

  it('carries a walk-in with no linked patient', async () => {
    const appointments = await fetchAppointments({ view: 'day', date: '2026-09-27' })

    expect(appointments[1]?.patientId).toBeNull()
    expect(appointments[1]?.fullName).toBe('Yangi Mijoz')
  })

  it('reads both the doctor id and name directly, confirmed against a real response', async () => {
    const appointments = await fetchAppointments({ view: 'day', date: '2026-09-27' })

    expect(appointments[0]?.doctorName).toBe('Sardor Usmonov')
    expect(appointments[0]?.doctorId).toBe(2)
  })

  it('trusts DRF to emit null for an unassigned doctor', async () => {
    const appointments = await fetchAppointments({ view: 'day', date: '2026-09-28' })

    expect(appointments[0]?.doctorName).toBeNull()
  })

  it('accepts a plain array, unconfirmed whether the endpoint ever paginates', async () => {
    const appointments = await fetchAppointments({ view: 'week', date: '2026-09-27' })

    expect(appointments.length).toBeGreaterThan(0)
  })

  it('also accepts a paginated envelope, in case the endpoint turns out to send one', async () => {
    server.use(
      http.get('/api/v1/calendars/appointments/', () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              full_name: 'Test',
              phone_number: null,
              patient: null,
              doctor: null,
              date: '2026-09-27',
              time: '10:00',
              notes: null,
              status: 'in_progress',
            },
          ],
        }),
      ),
    )

    const appointments = await fetchAppointments({ view: 'day', date: '2026-09-27' })

    expect(appointments).toHaveLength(1)
  })

  it('follows `next` so a day with more than one page loses no appointment', async () => {
    const row = (id: number) => ({
      id,
      patient: 'Test',
      doctor: null,
      date: '2026-09-27',
      time: '10:00',
      status: 'in_progress',
    })
    server.use(
      http.get('/api/v1/calendars/appointments/', ({ request }) => {
        const page = new URL(request.url).searchParams.get('page')
        return HttpResponse.json(
          page === '2'
            ? { count: 2, next: null, previous: null, results: [row(2)] }
            : {
                count: 2,
                next: 'https://salomatos.uz/api/v1/calendars/appointments/?date=day&page=2',
                previous: null,
                results: [row(1)],
              },
        )
      }),
    )

    const appointments = await fetchAppointments({ view: 'day', date: '2026-09-27' })

    expect(appointments.map((appointment) => appointment.id)).toEqual([1, 2])
  })

  it('asks for the viewed day by its real date, today included', async () => {
    let requested: string | null = null
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/calendars/appointments/')) {
        requested = new URL(request.url).searchParams.get('date')
      }
    })

    await fetchAppointments({ view: 'day', date: clinicNow().date })

    expect(requested).toBe(clinicNow().date)
  })

  it('reads a week as its seven dated days, so any week can be shown', async () => {
    const requested: (string | null)[] = []
    server.use(
      http.get('/api/v1/calendars/appointments/', ({ request }) => {
        const date = new URL(request.url).searchParams.get('date')
        requested.push(date)
        return HttpResponse.json([{ id: requested.length, patient: 'Test', date, time: '10:00' }])
      }),
    )

    const appointments = await fetchAppointments({ view: 'week', date: '2026-10-21' })

    expect([...requested].sort()).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
    expect(appointments).toHaveLength(7)
  })

  it('falls back to `in_progress` for a status it does not recognise, rather than throwing', async () => {
    server.use(
      http.get('/api/v1/calendars/appointments/', () =>
        HttpResponse.json([
          {
            id: 1,
            full_name: 'Test',
            phone_number: null,
            patient: null,
            doctor: null,
            date: '2026-09-27',
            time: '10:00',
            notes: null,
            status: 'cancelled',
          },
        ]),
      ),
    )

    const appointments = await fetchAppointments({ view: 'day', date: '2026-09-27' })

    expect(appointments[0]?.status).toBe('in_progress')
  })

  it('degrades an unexpected `doctor` shape to null rather than failing the whole day', async () => {
    server.use(
      http.get('/api/v1/calendars/appointments/', () =>
        HttpResponse.json([
          {
            id: 1,
            full_name: 'Test',
            phone_number: null,
            patient: null,
            doctor: { id: 5, name: 'Sardor Usmonov' },
            date: '2026-09-27',
            time: '10:00',
            notes: null,
            status: 'in_progress',
          },
        ]),
      ),
    )

    const appointments = await fetchAppointments({ view: 'day', date: '2026-09-27' })

    expect(appointments[0]?.doctorName).toBeNull()
    expect(appointments[0]?.doctorId).toBeNull()
  })

  it('falls back to an empty name for a row with none, rather than failing the whole day', async () => {
    server.use(
      http.get('/api/v1/calendars/appointments/', () =>
        HttpResponse.json([{ id: 1, date: '2026-09-27', time: '10:00' }]),
      ),
    )

    const appointments = await fetchAppointments({ view: 'day', date: '2026-09-27' })

    expect(appointments[0]?.fullName).toBe('')
  })
})

describe('fetchAppointmentPage', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it("asks for one page of all appointments and keeps DRF's count and links", async () => {
    let requested = new URLSearchParams()
    server.use(
      http.get('/api/v1/calendars/appointments/', ({ request }) => {
        requested = new URL(request.url).searchParams
        return HttpResponse.json({
          count: 11,
          next: null,
          previous: 'https://salomatos.uz/api/v1/calendars/appointments/?date=week',
          results: [{ id: 11, patient: 'Test', date: '2026-09-27', time: '10:00' }],
        })
      }),
    )

    const page = await fetchAppointmentPage({ view: 'all', date: '2026-09-27' }, 2)

    expect(requested.get('date')).toBeNull()
    expect(requested.get('page')).toBe('2')
    expect(page.count).toBe(11)
    expect(page.next).toBeNull()
    expect(page.previous).not.toBeNull()
    expect(page.results.map((appointment) => appointment.id)).toEqual([11])
  })

  it('sends no `date` and no `page` for the first page of all appointments', async () => {
    let search: string | null = null
    server.use(
      http.get('/api/v1/calendars/appointments/', ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json({ count: 0, next: null, previous: null, results: [] })
      }),
    )

    await fetchAppointmentPage({ view: 'all', date: '2026-09-27' }, 1)

    expect(search).toBe('')
  })
})
