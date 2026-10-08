import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PatientFilters } from '@/entities/patient'
import { useSessionStore } from '@/entities/session'
import { accessTokenFor, MOCK_USERS } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { PatientTable } from './PatientTable'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
  useSessionStore.getState().clear()
})
afterAll(() => server.close())

const CLINIC_ID = MOCK_USERS.clinic.id

const filters: Omit<PatientFilters, 'search'> = {
  status: null,
  doctor: '',
  treatmentTypeId: null,
  page: 1,
}

/** A signed-in clinic account, which is what `<Can>` reads. */
function signIn() {
  setAccessToken(accessTokenFor('clinic'))
  useSessionStore.getState().setSession({
    userId: CLINIC_ID,
    clinicId: CLINIC_ID,
    fullName: 'Dilnoza Rahimova',
    phoneNumber: null,
    email: null,
    role: 'superadmin',
    permissions: new Set(['patient:read', 'patient:write']),
  })
}

function renderTable(filterOverrides: Partial<Omit<PatientFilters, 'search'>> = {}) {
  const onOpenPatient = vi.fn()
  const onFiltersChange = vi.fn()

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <PatientTable
            clinicId={CLINIC_ID}
            filters={{ ...filters, ...filterOverrides }}
            onFiltersChange={onFiltersChange}
            onOpenPatient={onOpenPatient}
          />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { onOpenPatient, onFiltersChange, queryClient }
}

describe('PatientTable', () => {
  beforeEach(signIn)

  it('renders the rows the server sent', async () => {
    renderTable()

    expect(await screen.findByText('Vali Aliyev')).toBeInTheDocument()
    expect(screen.getByText('Nodira Karimova')).toBeInTheDocument()
  })

  it('formats a phone number the way the form does', async () => {
    renderTable()

    // Same grouping wherever staff meet a number.
    expect(await screen.findByText('+998-90-123-45-67')).toBeInTheDocument()
  })

  it('shows a dash rather than a blank cell for a patient with nothing on record', async () => {
    renderTable()

    await screen.findByText('Jasur Toshmatov')
    // Three columns are empty for this patient; an empty <td> reads as a
    // rendering fault rather than as "nothing here".
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('opens a patient when the row is clicked', async () => {
    const { onOpenPatient } = renderTable()

    await userEvent.click(await screen.findByText('Vali Aliyev'))

    expect(onOpenPatient).toHaveBeenCalledWith(101)
  })

  it('warms the card on hover so the click has nothing to wait for', async () => {
    const { queryClient } = renderTable()

    await userEvent.hover(await screen.findByText('Vali Aliyev'))

    await waitFor(() => {
      expect(
        queryClient.getQueryData(['clinics', CLINIC_ID, 'patients', 'detail', 101]),
      ).toBeDefined()
    })
  })

  it('searches without ever putting the term in the URL', async () => {
    /*
     * 🔴 §3, and the reason `search` is not part of the route's search params.
     * A patient's name in the address bar reaches the access log, the Referer
     * header and the browser's history.
     */
    const before = window.location.href
    renderTable()

    await screen.findByText('Vali Aliyev')
    await userEvent.type(screen.getByLabelText('Bemorlarni qidirish'), 'Nodira')

    expect(await screen.findByText('Nodira Karimova')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Vali Aliyev')).not.toBeInTheDocument())

    expect(window.location.href).toBe(before)
  })

  it('offers a way back when a search matches nothing', async () => {
    renderTable()

    await screen.findByText('Vali Aliyev')
    await userEvent.type(screen.getByLabelText('Bemorlarni qidirish'), 'Zzzz')

    expect(await screen.findByText('Hech narsa topilmadi')).toBeInTheDocument()
    // Not "add a patient" — that is not what this person was trying to do.
    expect(screen.getByRole('button', { name: "Barcha bemorlarni ko'rsatish" })).toBeInTheDocument()
  })

  it('opens the row menu without navigating to the patient', async () => {
    const { onOpenPatient } = renderTable()

    await screen.findByText('Vali Aliyev')
    await userEvent.click(screen.getByRole('button', { name: 'Tahrirlash — Vali Aliyev' }))

    expect(screen.getByRole('menuitem', { name: 'Tahrirlash' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: "O'chirish" })).toBeInTheDocument()
    expect(onOpenPatient).not.toHaveBeenCalled()
  })

  it('opens the edit dialog from the row menu', async () => {
    renderTable()

    await screen.findByText('Vali Aliyev')
    await userEvent.click(screen.getByRole('button', { name: 'Tahrirlash — Vali Aliyev' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Tahrirlash' }))

    expect(await screen.findByRole('heading', { name: 'Bemorni tahrirlash' })).toBeInTheDocument()
  })

  it('filters by treatment type through the select, not free text', async () => {
    const { onFiltersChange } = renderTable()
    await screen.findByText('Vali Aliyev')

    const select = screen.getByRole('combobox', { name: "Muolaja turi bo'yicha filtr" })
    await userEvent.click(select)
    await userEvent.click(screen.getByRole('option', { name: 'Tozalash' }))

    expect(onFiltersChange).toHaveBeenCalledWith({ ...filters, treatmentTypeId: 8, page: 1 })
  })

  it('sends null, not the sentinel, when "all" is chosen again', async () => {
    // Radix's `Select` treats `""` as "nothing selected" no matter what — the
    // filter's "all" option has to use a different sentinel value, or this
    // never renders anything to pick in the first place. Starting from a
    // non-null filter, since the select's value is controlled by `filters`
    // and this widget never re-renders itself with the result of its own
    // `onFiltersChange` call — that is the route's job (see `PatientsPage`).
    const { onFiltersChange } = renderTable({ treatmentTypeId: 8 })
    await screen.findByText('Vali Aliyev')

    const select = screen.getByRole('combobox', { name: "Muolaja turi bo'yicha filtr" })
    expect(select).toHaveTextContent('Tozalash')

    await userEvent.click(select)
    await userEvent.click(screen.getByRole('option', { name: 'Barcha muolaja turlari' }))

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...filters,
      treatmentTypeId: null,
      page: 1,
    })
  })

  it('filters by status through the select', async () => {
    const { onFiltersChange } = renderTable()
    await screen.findByText('Vali Aliyev')

    const select = screen.getByRole('combobox', { name: "Holat bo'yicha filtr" })
    await userEvent.click(select)
    await userEvent.click(screen.getByRole('option', { name: 'Yakunlangan' }))

    expect(onFiltersChange).toHaveBeenCalledWith({ ...filters, status: 'completed', page: 1 })
  })

  it('sends the doctor filter to the URL, unlike the PHI search box', async () => {
    const { onFiltersChange } = renderTable()
    await screen.findByText('Vali Aliyev')

    const select = screen.getByRole('combobox', { name: "Shifokor bo'yicha filtr" })
    await userEvent.click(select)
    await userEvent.click(await screen.findByRole('option', { name: 'Sardor Usmonov' }))

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...filters,
      doctor: 'Sardor Usmonov',
      page: 1,
    })
  })

  it('hides the create button from a user without permission', async () => {
    useSessionStore.getState().setSession({
      userId: CLINIC_ID,
      clinicId: CLINIC_ID,
      fullName: 'Sardor Usmonov',
      phoneNumber: null,
      email: null,
      role: 'doctor',
      // A doctor may read patients but not write them (ADR-012).
      permissions: new Set(['patient:read']),
    })

    renderTable()

    await screen.findByText('Vali Aliyev')
    expect(screen.queryByRole('button', { name: "Bemor qo'shish" })).not.toBeInTheDocument()
  })
})
