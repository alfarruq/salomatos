import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, HttpResponse, http, type JsonBodyType } from 'msw'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { permissionsForRole, useSessionStore } from '@/entities/session'
import { accessTokenFor, MOCK_USERS } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { DashboardToday } from './DashboardToday'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
  useSessionStore.getState().clear()
  vi.useRealTimers()
})
afterAll(() => server.close())

/** 10:00 in Tashkent (UTC+5) on 2026-10-09. */
const NOW = new Date('2026-10-09T05:00:00Z')
const TODAY = '2026-10-09'

const row = (
  id: number,
  time: string,
  patientId: number | null,
  name: string,
  status: 'in_progress' | 'completed',
  doctorId = 2,
) => ({
  id,
  patient_id: patientId,
  patient: name,
  phone_number: null,
  doctor_id: doctorId,
  doctor: doctorId === 2 ? 'Sardor Usmonov' : 'Malika Yusupova',
  treatment_type: null,
  date: TODAY,
  time: `${time}:00`,
  notes: null,
  status,
})

const DAY = [
  row(1, '09:00', 101, 'Vali Aliyev', 'completed'),
  row(3, '11:00', null, 'Yangi Mijoz', 'in_progress'),
  row(2, '10:30', 102, 'Nodira Karimova', 'in_progress'),
  // Yesterday's row the server should not have sent — it must not be counted.
  { ...row(4, '12:00', 103, 'Kecha', 'in_progress'), date: '2026-10-08' },
]

function serve(body: JsonBodyType) {
  server.use(http.get('/api/v1/calendars/appointments/', () => HttpResponse.json(body)))
}

function renderDashboard(doctorId: number | null = null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <DashboardToday clinicId={MOCK_USERS.clinic.id} doctorId={doctorId} />,
  })
  const patientRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/patients/$patientId',
    component: function PatientStub() {
      const { patientId } = patientRoute.useParams()
      return <p>patient page {patientId}</p>
    },
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, patientRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <RouterProvider router={router} />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { router }
}

describe('DashboardToday', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    setAccessToken(accessTokenFor('clinic'))
    useSessionStore.getState().setSession({
      userId: MOCK_USERS.clinic.id,
      clinicId: MOCK_USERS.clinic.id,
      fullName: 'Klinika',
      phoneNumber: null,
      email: null,
      role: 'superadmin',
      permissions: permissionsForRole('superadmin'),
    })
  })

  it('shows a skeleton while the day loads', async () => {
    server.use(
      http.get('/api/v1/calendars/appointments/', async () => {
        await delay('infinite')
        return HttpResponse.json([])
      }),
    )
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'Bugungi navbat' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Bugungi navbat' })).not.toBeInTheDocument()
  })

  it('lists today in time order and counts from that same list', async () => {
    serve({ count: DAY.length, next: null, previous: null, results: DAY })
    renderDashboard()

    const list = await screen.findByRole('list', { name: 'Bugungi navbat' })
    const names = within(list)
      .getAllByRole('listitem')
      .map((item) => item.textContent)
    expect(names[0]).toContain('Vali Aliyev')
    expect(names[1]).toContain('Nodira Karimova')
    expect(names[2]).toContain('Yangi Mijoz')
    expect(screen.queryByText('Kecha')).not.toBeInTheDocument()

    const counters = screen.getByText('Jami qabullar').closest('dl') as HTMLElement
    expect(within(counters).getByText('3')).toBeInTheDocument()
    expect(within(counters).getByText('1')).toBeInTheDocument()
    expect(within(counters).getByText('2')).toBeInTheDocument()
  })

  it('highlights the next open appointment, not the completed or past one', async () => {
    serve(DAY)
    renderDashboard()

    const next = (await screen.findByText('Navbatdagi')).closest('[data-next]') as HTMLElement
    expect(next).toHaveTextContent('Nodira Karimova')
    expect(next).toHaveTextContent('10:30')
  })

  it("opens the patient's page from a row", async () => {
    serve(DAY)
    const { router } = renderDashboard()

    await userEvent.click(await screen.findByRole('link', { name: /Nodira Karimova/ }))

    expect(await screen.findByText('patient page 102')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/patients/102')
  })

  it('leaves a walk-in without a patient record as plain text', async () => {
    serve(DAY)
    renderDashboard()

    await screen.findByRole('list', { name: 'Bugungi navbat' })
    expect(screen.queryByRole('link', { name: /Yangi Mijoz/ })).not.toBeInTheDocument()
  })

  it("narrows to one doctor's queue", async () => {
    serve([...DAY, row(5, '13:00', 104, 'Boshqa shifokor bemori', 'in_progress', 4)])
    renderDashboard(4)

    const list = await screen.findByRole('list', { name: 'Bugungi navbat' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(list).toHaveTextContent('Boshqa shifokor bemori')
  })

  it('offers to book when nobody is booked today', async () => {
    serve([])
    renderDashboard()

    expect(await screen.findByRole('heading', { name: "Bugun qabul yo'q" })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Qabul qo'shish" })).toBeInTheDocument()
  })

  it('says so when the day cannot be loaded', async () => {
    server.use(
      http.get('/api/v1/calendars/appointments/', () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    )
    renderDashboard()

    expect(
      await screen.findByRole('heading', { name: 'Bu sahifa ochilmadi' }, { timeout: 8000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Qayta urinish' })).toBeInTheDocument()
  })
})
