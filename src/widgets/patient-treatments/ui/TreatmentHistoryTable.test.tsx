import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { TreatmentHistoryTable } from './TreatmentHistoryTable'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

const CLINIC_ID = 1

function renderTable(patientId = 101) {
  const onCreate = vi.fn()
  const onEdit = vi.fn()
  const onComplete = vi.fn()
  const onDelete = vi.fn()
  const onTakePayment = vi.fn()

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <TreatmentHistoryTable
            clinicId={CLINIC_ID}
            onComplete={onComplete}
            onCreate={onCreate}
            onDelete={onDelete}
            onEdit={onEdit}
            onTakePayment={onTakePayment}
            patientId={patientId}
          />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { onCreate, onEdit, onComplete, onDelete, onTakePayment }
}

describe('TreatmentHistoryTable', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('renders the fixture rows and the status summary', async () => {
    renderTable()

    expect(await screen.findByText('Implantatsiya')).toBeInTheDocument()
    expect(screen.getByText('Tozalash')).toBeInTheDocument()
    expect(screen.getByText('Jami: 2')).toBeInTheDocument()
    expect(screen.getByText('Jarayonda: 1')).toBeInTheDocument()
    expect(screen.getByText('Tugallangan: 1')).toBeInTheDocument()
  })

  it('shows an empty state with a call to action for a patient with no treatments', async () => {
    const { onCreate } = renderTable(103)

    expect(await screen.findByText("Muolajalar yo'q")).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: "Birinchi muolajani qo'shing" }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('opens the detail dialog on a double-click on the tooth badge', async () => {
    renderTable()

    await userEvent.dblClick(await screen.findByRole('button', { name: '36' }))

    expect(await screen.findByRole('heading', { name: "Muolaja ma'lumotlari" })).toBeInTheDocument()
    expect(screen.getByText(/Tish: 36/)).toBeInTheDocument()
  })

  it('offers "mark completed" only for an unfinished treatment', async () => {
    renderTable()
    await screen.findByText('Implantatsiya')

    await userEvent.click(screen.getByRole('button', { name: /Amallar — Implantatsiya/ }))
    expect(screen.getByRole('menuitem', { name: 'Muolajani yakunlash' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('menuitem', { name: 'Muolajani yakunlash' }))
    await userEvent.click(screen.getByRole('button', { name: /Amallar — Tozalash/ }))
    expect(screen.queryByRole('menuitem', { name: 'Muolajani yakunlash' })).not.toBeInTheDocument()
  })

  it('shows the debt in red when there is one, and not when there is none', async () => {
    renderTable()
    await screen.findByText('Implantatsiya')

    const implantRow = screen.getByText('Implantatsiya').closest('tr')
    const cleaningRow = screen.getByText('Tozalash').closest('tr')
    if (implantRow === null || cleaningRow === null) throw new Error('row not found')

    // Fixture: Implantatsiya still owes 1,200,000; Tozalash is fully paid.
    expect(within(implantRow).getByText(/1.200.000/)).toHaveClass('text-danger')
    expect(within(cleaningRow).getByText(/^0 /)).not.toHaveClass('text-danger')
  })
})
