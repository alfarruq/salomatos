import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { TreatmentTypeTable } from './TreatmentTypeTable'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

function renderTable() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <TreatmentTypeTable clinicId={1} />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

describe('TreatmentTypeTable', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('opens with "Barchasi" shown, not a blank select', async () => {
    renderTable()

    // Radix `Select` treats `""` as "no selection, show the placeholder" no
    // matter what — the filter's "all" option must use a different sentinel,
    // or this combobox renders empty on first paint.
    await screen.findByText('Implantatsiya')
    expect(
      screen.getByRole('combobox', { name: "Shifokor turi bo'yicha filtr" }),
    ).toHaveTextContent('Barchasi')
  })

  it('filters to one doctor type and back to all', async () => {
    renderTable()
    await screen.findByText('Implantatsiya')

    const select = screen.getByRole('combobox', { name: "Shifokor turi bo'yicha filtr" })
    await userEvent.click(select)
    await userEvent.click(screen.getByRole('option', { name: 'Stomatolog' }))

    expect(screen.getByText('Implantatsiya')).toBeInTheDocument()
    expect(screen.queryByText('Tozalash')).not.toBeInTheDocument()
    expect(screen.queryByText('Ortodontik davolash')).not.toBeInTheDocument()

    // The regression this covers: with "" as the sentinel, Select's own
    // native-bubble guard silently swallowed the switch back to "all".
    await userEvent.click(select)
    await userEvent.click(screen.getByRole('option', { name: 'Barchasi' }))

    expect(select).toHaveTextContent('Barchasi')
    expect(screen.getByText('Tozalash')).toBeInTheDocument()
    expect(screen.getByText('Ortodontik davolash')).toBeInTheDocument()
  })

  it('filters to services with no doctor type assigned', async () => {
    renderTable()
    await screen.findByText('Implantatsiya')

    const select = screen.getByRole('combobox', { name: "Shifokor turi bo'yicha filtr" })
    await userEvent.click(select)
    await userEvent.click(screen.getByRole('option', { name: 'Tayinlanmagan' }))

    expect(screen.getByText('Ortodontik davolash')).toBeInTheDocument()
    expect(screen.queryByText('Implantatsiya')).not.toBeInTheDocument()
  })

  it('shows a message rather than an empty table when nothing matches', async () => {
    // A doctor type no fixture service is billed under.
    server.use(
      http.get('/api/v1/clinic/doctors/types/', () =>
        HttpResponse.json([
          { id: 5, name: 'Stomatolog' },
          { id: 9, name: 'Terapevt' },
        ]),
      ),
    )
    renderTable()
    await screen.findByText('Implantatsiya')

    const select = screen.getByRole('combobox', { name: "Shifokor turi bo'yicha filtr" })
    await userEvent.click(select)
    await userEvent.click(screen.getByRole('option', { name: 'Terapevt' }))

    expect(screen.getByText('Bu turdagi xizmat topilmadi')).toBeInTheDocument()
    expect(screen.queryByText('Implantatsiya')).not.toBeInTheDocument()
  })

  it('shows "so\'m", not the ISO currency code', async () => {
    renderTable()

    const row = (await screen.findByText('Implantatsiya')).closest('tr')
    if (row === null) throw new Error('row not found')
    expect(within(row).getByText(/so'm/)).toBeInTheDocument()
    expect(within(row).queryByText(/UZS/)).not.toBeInTheDocument()
  })
})
