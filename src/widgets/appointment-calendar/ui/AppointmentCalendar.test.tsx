import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
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

function renderCalendar(
  filters: AppointmentFilters,
  onFiltersChange = vi.fn(),
  onOpenPatient = vi.fn(),
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <AppointmentCalendar
            clinicId={1}
            filters={filters}
            onFiltersChange={onFiltersChange}
            onOpenPatient={onOpenPatient}
            onPageChange={vi.fn()}
            page={1}
            title={null}
          />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )
  return { onFiltersChange, onOpenPatient }
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

  it("opens a registered patient's card from their appointment", async () => {
    const onOpenPatient = vi.fn()
    renderCalendar({ view: 'day', date: '2026-09-27' }, vi.fn(), onOpenPatient)

    await userEvent.click(await screen.findByText('Vali Aliyev'))

    expect(onOpenPatient).toHaveBeenCalledWith(101)
  })

  it('offers to register a walk-in, pre-filled from the appointment', async () => {
    const onOpenPatient = vi.fn()
    renderCalendar({ view: 'day', date: '2026-09-27' }, vi.fn(), onOpenPatient)

    await userEvent.click(await screen.findByText('Yangi Mijoz'))
    expect(await screen.findByText("Bemor bazada yo'q")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: "Ha, qo'shish" }))

    expect(await screen.findByLabelText('F. I. Sh.')).toHaveValue('Yangi Mijoz')
    expect(screen.getByLabelText('Telefon raqami')).toHaveValue('90-765-43-21')
    expect(onOpenPatient).not.toHaveBeenCalled()
  })

  it('opens the picked date as a day view from the week view', async () => {
    const { onFiltersChange } = renderCalendar({ view: 'week', date: '2026-09-27' })

    fireEvent.change(await screen.findByLabelText('Sana'), { target: { value: '2026-10-05' } })

    expect(onFiltersChange).toHaveBeenLastCalledWith({ view: 'day', date: '2026-10-05' })
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
      // A week is fetched day by day, so answer each `?date=` with its own rows.
      http.get('/api/v1/calendars/appointments/', ({ request }) => {
        const date = new URL(request.url).searchParams.get('date')
        const rows = [
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
        ]
        return HttpResponse.json(rows.filter((row) => row.date === date))
      }),
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

  it('no longer offers an all-appointments view', async () => {
    renderCalendar({ view: 'day', date: '2026-09-27' })
    await screen.findByText('Vali Aliyev')

    expect(screen.queryByRole('button', { name: 'Hammasi' })).not.toBeInTheDocument()
  })

  it('moves a week forward from the arrow beside the weekday row', async () => {
    const { onFiltersChange } = renderCalendar({ view: 'week', date: '2026-09-28' })

    await userEvent.click(await screen.findByRole('button', { name: 'Keyingi hafta' }))

    expect(onFiltersChange).toHaveBeenLastCalledWith({ view: 'week', date: '2026-10-05' })
  })

  it('narrows the list to one doctor through doctor_id', async () => {
    renderCalendar({ view: 'all', date: '2026-09-27', doctorId: 2 })

    await screen.findByText('Vali Aliyev')
    expect(screen.queryByText('Yangi Mijoz')).not.toBeInTheDocument()
  })

  it('picks a doctor through onFiltersChange, keeping the view', async () => {
    const { onFiltersChange } = renderCalendar({ view: 'day', date: '2026-09-27' })
    await screen.findByText('Vali Aliyev')

    await userEvent.click(screen.getByRole('combobox', { name: 'Shifokor' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Sardor Usmonov' }))

    expect(onFiltersChange).toHaveBeenLastCalledWith({
      view: 'day',
      date: '2026-09-27',
      doctorId: 2,
    })
  })

  it('keeps the picked doctor when switching view', async () => {
    const { onFiltersChange } = renderCalendar({ view: 'day', date: '2026-09-27', doctorId: 2 })
    await screen.findByText('Vali Aliyev')

    await userEvent.click(screen.getByRole('button', { name: 'Haftalik' }))

    expect(onFiltersChange).toHaveBeenLastCalledWith({
      view: 'week',
      date: expect.any(String),
      doctorId: 2,
    })
  })

  it('shows the date column and every fixture row in the all view', async () => {
    renderCalendar({ view: 'all', date: '2026-09-27' })

    await screen.findByText('Vali Aliyev')
    expect(screen.getByText('Sana')).toBeInTheDocument()
    expect(screen.getByText('Nodira Karimova')).toBeInTheDocument()
  })
})
