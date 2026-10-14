import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, HttpResponse, http } from 'msw'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { permissionsForRole, type Role, useSessionStore } from '@/entities/session'
import { accessTokenFor, MOCK_USERS } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { TreatmentTable } from './TreatmentTable'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
  useSessionStore.getState().clear()
})
afterAll(() => server.close())

const ROW = {
  id: 1,
  patient_id: 101,
  patient: 'Vali Aliyev',
  doctor: 'Sardor Usmonov',
  treatment_type: 'Implantatsiya',
  total_treatment_cost: 4_000_000,
  total_paid: 2_800_000,
  remaining: '1200000',
  visit_number: 3,
  tooth_number: 36,
  start_date: '2026-08-20',
  notes: null,
  status: 'in_progress',
}

function signIn(role: Role) {
  setAccessToken(accessTokenFor('clinic'))
  useSessionStore.getState().setSession({
    userId: MOCK_USERS.clinic.id,
    clinicId: MOCK_USERS.clinic.id,
    fullName: 'Test',
    phoneNumber: null,
    email: null,
    role,
    permissions: permissionsForRole(role),
  })
}

function renderTable(page = 1) {
  const onPageChange = vi.fn()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <TreatmentTable clinicId={MOCK_USERS.clinic.id} onPageChange={onPageChange} page={page} />
    ),
  })
  const patientRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/patients/$patientId',
    component: () => <p>patient page</p>,
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

  return { onPageChange, router }
}

describe('TreatmentTable', () => {
  beforeEach(() => signIn('superadmin'))

  it('lists every treatment in the clinic, with the patient and the money', async () => {
    renderTable()

    expect(await screen.findAllByRole('link', { name: 'Vali Aliyev' })).toHaveLength(2)
    expect(screen.getByText('20.08.2026')).toBeInTheDocument()
    expect(screen.getByText('Implantatsiya')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Qarz' })).toBeInTheDocument()
  })

  it('shows money still owed in red, and a settled treatment plainly', async () => {
    server.use(
      http.get('/api/v1/clinic/treatments/', () =>
        HttpResponse.json({
          count: 2,
          next: null,
          previous: null,
          results: [
            { ...ROW, id: 1, treatment_type: 'Qarzli', remaining: '1200000' },
            { ...ROW, id: 2, treatment_type: 'Tolangan', remaining: '0' },
          ],
        }),
      ),
    )
    renderTable()

    const owed = (await screen.findByText('Qarzli')).closest('tr') as HTMLElement
    const settled = screen.getByText('Tolangan').closest('tr') as HTMLElement
    expect(owed.querySelector('.text-danger')).not.toBeNull()
    expect(settled.querySelector('.text-danger')).toBeNull()
  })

  it('asks the server for the page it is on, with no patient filter', async () => {
    const seen: { url: URL | null } = { url: null }
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/clinic/treatments/')) seen.url = new URL(request.url)
    })
    renderTable(3)

    await vi.waitFor(() => expect(seen.url).not.toBeNull())
    expect(seen.url?.searchParams.get('page')).toBe('3')
    expect(seen.url?.searchParams.has('patient_id')).toBe(false)
  })

  it('hides the money columns from a doctor', async () => {
    signIn('doctor')
    renderTable()

    await screen.findAllByRole('link', { name: 'Vali Aliyev' })
    expect(screen.queryByRole('columnheader', { name: 'Qarz' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: "To'langan" })).not.toBeInTheDocument()
  })

  it("opens the patient's page from a row", async () => {
    const { router } = renderTable()

    await userEvent.click(await screen.findByText('Implantatsiya'))

    expect(await screen.findByText('patient page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/patients/101')
  })

  it('moves to the next page', async () => {
    server.use(
      http.get('/api/v1/clinic/treatments/', () =>
        HttpResponse.json({
          count: 11,
          next: 'https://salomatos.uz/api/v1/clinic/treatments/?page=2',
          previous: null,
          results: [ROW],
        }),
      ),
    )
    const { onPageChange } = renderTable()

    await screen.findByText('11 tadan 1–10')
    await userEvent.click(screen.getByRole('button', { name: 'Keyingi' }))

    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('shows a skeleton while loading', async () => {
    server.use(
      http.get('/api/v1/clinic/treatments/', async () => {
        await delay('infinite')
        return HttpResponse.json([])
      }),
    )
    renderTable()

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('says so when there are no treatments', async () => {
    server.use(
      http.get('/api/v1/clinic/treatments/', () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    )
    renderTable()

    expect(
      await screen.findByRole('heading', { name: "Hozircha muolaja yo'q" }),
    ).toBeInTheDocument()
  })

  it('offers a retry when the list cannot be loaded', async () => {
    server.use(
      http.get('/api/v1/clinic/treatments/', () =>
        HttpResponse.json({ message: 'boom' }, { status: 500 }),
      ),
    )
    renderTable()

    expect(
      await screen.findByRole('heading', { name: 'Bu sahifa ochilmadi' }, { timeout: 8000 }),
    ).toBeInTheDocument()
  })
})
