import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@/entities/session'
import { useLockStore } from '@/features/session-lock'
import { routeTree } from '@/routeTree.gen'
import { configureApi, resetApiContext } from '@/shared/api/httpContext'
import { setMockSession } from '@/shared/api/mocks/handlers'
import { server } from '@/shared/api/mocks/server'
import { IDLE_TIMEOUT_MS, IDLE_WARNING_MS } from '@/shared/lib/useIdleTimer'
import { Toaster } from '@/shared/ui'
import { createQueryClient } from './providers/queryClient'

/**
 * §16.2 scenario 1: login → dashboard → logout, driven through the real router,
 * the real guard and the real HTTP client against MSW.
 *
 * Worth doing at this level rather than per-unit: the parts that can go wrong
 * here are the seams — a guard that redirects to a page that redirects back, a
 * logout that leaves the previous user's data in the cache.
 */
function renderApp(initialPath = '/') {
  const queryClient = createQueryClient()

  // Mirrors AppProviders: the store only. Clearing the query cache here would
  // cancel the request that reported the 401.
  configureApi({
    onUnauthorized: () => useSessionStore.getState().clear(),
  })

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  )

  return { queryClient, router }
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetApiContext()
  setMockSession(null)
  useSessionStore.getState().clear()
  useLockStore.getState().unlock()
})
afterAll(() => server.close())

describe('authentication flow', () => {
  it('sends an unauthenticated visitor to the login form', async () => {
    renderApp('/dashboard')

    expect(await screen.findByRole('heading', { name: 'SalomatOS' })).toBeInTheDocument()
    expect(screen.getByLabelText('Parol')).toBeInTheDocument()
  })

  it('signs in and lands on the dashboard', async () => {
    renderApp('/login')

    await userEvent.type(await screen.findByLabelText('Email'), 'admin@example.test')
    await userEvent.type(screen.getByLabelText('Parol'), 'salomat')
    await userEvent.click(screen.getByRole('button', { name: 'Kirish' }))

    expect(await screen.findByRole('heading', { name: 'Boshqaruv paneli' })).toBeInTheDocument()
  })

  it('puts the server`s rejection on the form rather than in a toast', async () => {
    renderApp('/login')

    await userEvent.type(await screen.findByLabelText('Email'), 'admin@example.test')
    await userEvent.type(screen.getByLabelText('Parol'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Kirish' }))

    // §10: the message DRF returned, shown where the user is looking.
    expect(await screen.findByRole('alert')).toHaveTextContent('Email yoki parol xato.')
  })

  it('does not show the login form to someone already signed in', async () => {
    setMockSession('admin')
    renderApp('/login')

    expect(await screen.findByRole('heading', { name: 'Boshqaruv paneli' })).toBeInTheDocument()
  })

  it('sends a user with no clinic to onboarding instead of an empty dashboard', async () => {
    server.use(
      http.get('/api/me/', () =>
        HttpResponse.json({
          id: 'a1b2c3d4-0000-4000-8000-000000000001',
          first_name: 'Dilnoza',
          last_name: 'Rahimova',
          email: 'admin@example.test',
          role: 'ClinicAdmin',
          permissions: [],
          // Signed in, but belongs to no clinic yet.
          clinics: [],
          active_clinic_id: null,
        }),
      ),
    )

    renderApp('/dashboard')

    expect(
      await screen.findByRole('heading', { name: 'Sizga hali klinika biriktirilmagan' }),
    ).toBeInTheDocument()
  })
})

describe('logout', () => {
  beforeEach(() => setMockSession('admin'))

  it('clears the cache so the next member of staff sees nothing', async () => {
    const { queryClient } = renderApp('/dashboard')

    await screen.findByRole('heading', { name: 'Boshqaruv paneli' })
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: 'Dilnoza Rahimova' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Chiqish' }))

    // §13.4 — a shared reception desk is the reason this is not optional.
    await waitFor(() => {
      expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
      expect(useSessionStore.getState().session).toBeNull()
    })
  })
})

describe('clinic switching', () => {
  beforeEach(() => setMockSession('admin'))

  it('empties the cache so no data from the previous clinic can surface', async () => {
    const { queryClient } = renderApp('/dashboard')

    await screen.findByRole('heading', { name: 'Boshqaruv paneli' })

    // Something cached that belongs to the clinic being left.
    queryClient.setQueryData(
      ['clinics', '4f7b2e91-3a5c-4d18-9f60-1c2a8b7d4e33', 'patients'],
      ['Vali Aliyev'],
    )

    await userEvent.click(screen.getByRole('button', { name: 'Salomat Dental — Yunusobod' }))

    /*
     * 🔴 The point of §6.2. Showing one clinic's patients to another clinic's
     * staff is a data leak with legal consequences, not a display bug.
     */
    await waitFor(() => {
      expect(
        queryClient.getQueryData(['clinics', '4f7b2e91-3a5c-4d18-9f60-1c2a8b7d4e33', 'patients']),
      ).toBeUndefined()
    })
  })
})

describe('idle lock', () => {
  /*
   * Fake timers must be in place before the component mounts, or the idle
   * timeout is scheduled with the real `setTimeout` and advancing fake time
   * moves nothing. `shouldAdvanceTime` keeps promises and MSW working while
   * still allowing a deliberate jump forward.
   */
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    setMockSession('admin')
  })
  afterEach(() => vi.useRealTimers())

  async function goIdle() {
    await screen.findByRole('heading', { name: 'Boshqaruv paneli' })
    await act(async () => {
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS)
    })
    return screen.findByRole('heading', { name: 'Ekran qulflangan' })
  }

  it('locks the screen and drops the patient data behind it', async () => {
    const { queryClient } = renderApp('/dashboard')
    await screen.findByRole('heading', { name: 'Boshqaruv paneli' })

    const patientsKey = ['clinics', '4f7b2e91-3a5c-4d18-9f60-1c2a8b7d4e33', 'patients']
    queryClient.setQueryData(patientsKey, ['Vali Aliyev'])

    await act(async () => {
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS)
    })
    expect(await screen.findByRole('heading', { name: 'Ekran qulflangan' })).toBeInTheDocument()

    /*
     * §13.4 — the overlay is not what protects anything. Clearing the cache
     * is: an overlay alone would leave the patient record in the DOM, one
     * devtools panel or one screenshot away.
     *
     * The session query comes back on its own, because the layout still
     * subscribes to it. That is fine and not what is being protected: it is
     * the signed-in user's own name and permissions, not a patient's record.
     */
    expect(queryClient.getQueryData(patientsKey)).toBeUndefined()
    expect(screen.queryByRole('heading', { name: 'Boshqaruv paneli' })).not.toBeInTheDocument()
  })

  it('names who is locked out, and nothing about a patient', async () => {
    renderApp('/dashboard')
    await goIdle()

    // Identity is the only thing that survives a lock, and it is on screen in
    // a public room.
    expect(screen.getByText(/Dilnoza Rahimova/)).toBeInTheDocument()
  })

  it('warns before locking so the user can stay', async () => {
    renderApp('/dashboard')
    await screen.findByRole('heading', { name: 'Boshqaruv paneli' })

    await act(async () => {
      vi.advanceTimersByTime(IDLE_TIMEOUT_MS - IDLE_WARNING_MS)
    })

    expect(await screen.findByText('Ekran tez orada qulflanadi')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ekran qulflangan' })).not.toBeInTheDocument()
  })

  it('comes back to the dashboard on the right password', async () => {
    renderApp('/dashboard')
    await goIdle()

    await user.type(screen.getByLabelText('Parol'), 'salomat')
    await user.click(screen.getByRole('button', { name: 'Qulfni ochish' }))

    expect(await screen.findByRole('heading', { name: 'Boshqaruv paneli' })).toBeInTheDocument()
  })

  it('stays locked on the wrong password', async () => {
    renderApp('/dashboard')
    await goIdle()

    await user.type(screen.getByLabelText('Parol'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Qulfni ochish' }))

    expect(await screen.findByText("Parol noto'g'ri")).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ekran qulflangan' })).toBeInTheDocument()
  })
})
