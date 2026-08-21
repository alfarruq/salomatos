import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { useSessionStore } from '@/entities/session'
import { routeTree } from '@/routeTree.gen'
import { configureApi, resetApiContext } from '@/shared/api/httpContext'
import { setMockSession } from '@/shared/api/mocks/handlers'
import { server } from '@/shared/api/mocks/server'
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
