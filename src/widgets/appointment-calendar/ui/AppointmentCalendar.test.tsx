import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppointmentFilters } from '@/entities/appointment'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { AppointmentCalendar } from './AppointmentCalendar'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

function renderCalendar(filters: AppointmentFilters, onFiltersChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <AppointmentCalendar clinicId={1} filters={filters} onFiltersChange={onFiltersChange} />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )
  return { onFiltersChange }
}

describe('AppointmentCalendar', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it("shows the day's appointments, walk-in included", async () => {
    renderCalendar({ view: 'day', date: '2026-09-27' })

    await screen.findByText('Vali Aliyev')
    expect(screen.getByText('Yangi Mijoz')).toBeInTheDocument()
    // A different day's appointment must not leak into this one's table.
    expect(screen.queryByText('Nodira Karimova')).not.toBeInTheDocument()
  })

  it('does not show a date column in day view, but does in week view', async () => {
    renderCalendar({ view: 'day', date: '2026-09-27' })
    await screen.findByText('Vali Aliyev')
    expect(screen.queryByText('Sana')).not.toBeInTheDocument()
  })

  it('groups the week into day columns by each appointment’s own date', async () => {
    // 2026-09-28 is a Monday, so this Monday–Sunday board runs through
    // 2026-10-04 — unlike the shared `MOCK_APPOINTMENTS` fixture, which
    // straddles a week boundary (27th is the *previous* week’s Sunday) and so
    // cannot exercise both a Monday and a later-in-the-week column at once.
    server.use(
      http.get('/api/v1/calendars/appointments/', () =>
        HttpResponse.json([
          {
            id: 601,
            patient_id: null,
            patient: 'Hafta Boshi',
            phone_number: null,
            doctor_id: null,
            doctor: null,
            treatment_type: null,
            date: '2026-09-28',
            time: '09:00:00',
            notes: null,
            status: 'in_progress',
          },
          {
            id: 602,
            patient_id: null,
            patient: 'Hafta Oxiri',
            phone_number: null,
            doctor_id: null,
            doctor: null,
            treatment_type: null,
            date: '2026-10-02',
            time: '10:00:00',
            notes: null,
            status: 'completed',
          },
        ]),
      ),
    )

    renderCalendar({ view: 'week', date: '2026-09-28' })

    await screen.findByText('Hafta Boshi')
    expect(screen.getByText('Hafta Oxiri')).toBeInTheDocument()
    expect(screen.getByText('Du')).toBeInTheDocument()
    expect(screen.getByText('Ju')).toBeInTheDocument()
  })

  it('asks to move a day forward through onFiltersChange, not by refetching in place', async () => {
    const { onFiltersChange } = renderCalendar({ view: 'day', date: '2026-09-27' })
    await screen.findByText('Vali Aliyev')

    await userEvent.click(screen.getByRole('button', { name: 'Keyingi kun' }))

    expect(onFiltersChange).toHaveBeenLastCalledWith({ view: 'day', date: '2026-09-28' })
  })

  it('shows the empty state when the day has nothing scheduled', async () => {
    renderCalendar({ view: 'day', date: '2026-01-01' })

    expect(await screen.findByText("Hozircha uchrashuv yo'q")).toBeInTheDocument()
  })

  it('switches to the all view through onFiltersChange, resetting to today', async () => {
    const { onFiltersChange } = renderCalendar({ view: 'day', date: '2026-09-27' })
    await screen.findByText('Vali Aliyev')

    await userEvent.click(screen.getByRole('button', { name: 'Hammasi' }))

    expect(onFiltersChange).toHaveBeenLastCalledWith({
      view: 'all',
      date: expect.any(String),
    })
  })

  it('shows the date column and every fixture row in the all view', async () => {
    renderCalendar({ view: 'all', date: '2026-09-27' })

    await screen.findByText('Vali Aliyev')
    expect(screen.getByText('Sana')).toBeInTheDocument()
    expect(screen.getByText('Nodira Karimova')).toBeInTheDocument()
  })
})
