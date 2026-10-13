import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { CreateTreatmentTypeDialog } from './CreateTreatmentTypeDialog'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

/** A client of its own — see `CreatePatientDialog.test.tsx` for why. */
function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <CreateTreatmentTypeDialog clinicId={1} onOpenChange={vi.fn()} open />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

function captureCreate() {
  const sent: { body?: unknown } = {}
  server.use(
    http.post('/api/v1/clinic/treatment-types/', async ({ request }) => {
      sent.body = await request.json()
      return HttpResponse.json({ id: 800, name: 'Test', price: null, doctor_type: null })
    }),
  )
  return sent
}

describe('CreateTreatmentTypeDialog', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('opens with the dental type preselected', async () => {
    renderDialog()

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Turi' })).toHaveTextContent('Stomatolog')
    })
  })

  it('sends the preselected type without the person touching the select', async () => {
    const sent = captureCreate()
    renderDialog()

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Turi' })).toHaveTextContent('Stomatolog')
    })
    await userEvent.type(screen.getByLabelText('Xizmat'), 'Plomba')
    await userEvent.click(screen.getByRole('button', { name: "Xizmat qo'shish" }))

    await waitFor(() => expect(sent.body).toMatchObject({ doctor_type: 5 }))
  })

  it('sends whatever type the person actually picks instead', async () => {
    const sent = captureCreate()
    renderDialog()

    const select = await screen.findByRole('combobox', { name: 'Turi' })
    await waitFor(() => expect(select).toHaveTextContent('Stomatolog'))

    await userEvent.click(select)
    await userEvent.click(screen.getByRole('option', { name: 'Ortodont' }))
    await userEvent.type(screen.getByLabelText('Xizmat'), 'Breket')
    await userEvent.click(screen.getByRole('button', { name: "Xizmat qo'shish" }))

    await waitFor(() => expect(sent.body).toMatchObject({ doctor_type: 6 }))
  })
})
