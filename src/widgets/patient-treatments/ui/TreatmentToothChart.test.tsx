import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessTokenFor, MOCK_USERS } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { TreatmentToothChart } from './TreatmentToothChart'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

const row = (id: number, tooth: number, type: string, status: string, start: string) => ({
  id,
  doctor: 'Sardor Usmonov',
  treatment_type: type,
  tooth_number: tooth,
  start_date: start,
  status,
})

/** Tooth 16: one done, one open (amber). Tooth 21: done (green). */
const ROWS = [
  row(1, 16, 'Plomba', 'completed', '2026-08-01'),
  row(2, 16, 'Эндо Тиадент', 'in_progress', '2026-09-01'),
  row(3, 21, 'Tozalash', 'completed', '2026-07-01'),
]

function renderChart() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const handlers = {
    onEdit: vi.fn(),
    onComplete: vi.fn(),
    onDelete: vi.fn(),
    onTakePayment: vi.fn(),
  }

  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <TreatmentToothChart clinicId={MOCK_USERS.clinic.id} patientId={101} {...handlers} />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { container, handlers }
}

const tooth = (container: HTMLElement, fdi: string) =>
  container.querySelector<SVGGElement>(`[data-fdi="${fdi}"]`) as SVGGElement

describe('TreatmentToothChart', () => {
  beforeEach(() => {
    setAccessToken(accessTokenFor('clinic'))
    server.use(
      http.get('/api/v1/clinic/treatments/', () =>
        HttpResponse.json({ count: ROWS.length, next: null, previous: null, results: ROWS }),
      ),
    )
  })

  it('colours each tooth by its treatments, open ones winning', async () => {
    const { container } = renderChart()

    expect(await screen.findByText('Tugallangan')).toBeInTheDocument()
    expect(screen.getByText('Jarayonda')).toBeInTheDocument()
    expect(tooth(container, '16')).toHaveAttribute('data-status', 'in_progress')
    expect(tooth(container, '21')).toHaveAttribute('data-status', 'completed')
    expect(tooth(container, '11')).toHaveAttribute('data-status', 'none')
  })

  it("shows the tooth's treatment types on hover, and nothing on an untreated tooth", async () => {
    const { container } = renderChart()
    await screen.findByText('Tugallangan')

    await userEvent.hover(tooth(container, '16'))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Tish 16')
    expect(screen.getByRole('tooltip')).toHaveTextContent('Plomba, Эндо Тиадент')

    await userEvent.unhover(tooth(container, '16'))
    await userEvent.hover(tooth(container, '11'))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it("opens the tooth's latest treatment on click, and nothing for an untreated one", async () => {
    const { container } = renderChart()
    await screen.findByText('Tugallangan')

    await userEvent.click(tooth(container, '11'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(tooth(container, '16'))
    const dialog = await screen.findByRole('dialog', { name: "Muolaja ma'lumotlari" })
    expect(dialog).toHaveTextContent('Эндо Тиадент')
  })
})
