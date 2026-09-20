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
import { CreateDoctorDialog } from './CreateDoctorDialog'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

/** A client of its own — see `CreatePatientDialog.test.tsx` for why. */
function renderDialog(onCreated = vi.fn()) {
  const onOpenChange = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <CreateDoctorDialog clinicId={1} onCreated={onCreated} onOpenChange={onOpenChange} open />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { onCreated, onOpenChange }
}

describe('CreateDoctorDialog', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('opens with "Stomatolog" preselected, most clinics being dental', async () => {
    renderDialog()

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Turi' })).toHaveTextContent('Stomatolog')
    })
  })

  it('sends the preselected type without the person touching the select', async () => {
    let sentBody: unknown
    server.use(
      http.post('/api/v1/clinic/doctors/', async ({ request }) => {
        sentBody = await request.json()
        return HttpResponse.json({ id: 900, full_name: 'Test', phone_number: null, email: null })
      }),
    )

    renderDialog()

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Turi' })).toHaveTextContent('Stomatolog')
    })
    await userEvent.type(screen.getByLabelText('F. I. Sh.'), 'Yangi Shifokor')
    await userEvent.type(screen.getByLabelText('Telefon raqami'), '935550099')
    await userEvent.click(screen.getByRole('button', { name: "Shifokor qo'shish" }))

    await waitFor(() => expect(sentBody).toMatchObject({ doctor_type: 5 }))
  })

  it('sends whatever type the person actually picks instead', async () => {
    let sentBody: unknown
    server.use(
      http.post('/api/v1/clinic/doctors/', async ({ request }) => {
        sentBody = await request.json()
        return HttpResponse.json({ id: 900, full_name: 'Test', phone_number: null, email: null })
      }),
    )

    renderDialog()

    const select = await screen.findByRole('combobox', { name: 'Turi' })
    await waitFor(() => expect(select).toHaveTextContent('Stomatolog'))

    await userEvent.click(select)
    await userEvent.click(screen.getByRole('option', { name: 'Ortodont' }))

    await userEvent.type(screen.getByLabelText('F. I. Sh.'), 'Yangi Shifokor')
    await userEvent.type(screen.getByLabelText('Telefon raqami'), '935550099')
    await userEvent.click(screen.getByRole('button', { name: "Shifokor qo'shish" }))

    await waitFor(() => expect(sentBody).toMatchObject({ doctor_type: 6 }))
  })

  it('resets to the default rather than to unassigned, so a second doctor gets one too', async () => {
    const { onCreated } = renderDialog()

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Turi' })).toHaveTextContent('Stomatolog')
    })
    await userEvent.type(screen.getByLabelText('F. I. Sh.'), 'Birinchi Shifokor')
    await userEvent.type(screen.getByLabelText('Telefon raqami'), '935550001')
    await userEvent.click(screen.getByRole('button', { name: "Shifokor qo'shish" }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce())

    /*
     * `reset` clears `dirtyFields` back to untouched, which is what the
     * preselect effect watches — without restoring the default on success
     * itself, this would come back empty for every doctor after the first.
     */
    expect(screen.getByRole('combobox', { name: 'Turi' })).toHaveTextContent('Stomatolog')
  })
})
