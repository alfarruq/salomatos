import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessTokenFor, MOCK_DOCTORS, MOCK_USERS } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { CreateAppointmentDialog } from './CreateAppointmentDialog'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const i18n = createI18n('uz-Latn')

function wrap(children: ReactNode) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <Suspense fallback={null}>{children}</Suspense>
      </I18nextProvider>
    </QueryClientProvider>
  )
}

describe('CreateAppointmentDialog', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('opens on the date it is given now, not the one it was first mounted with', async () => {
    const props = { clinicId: MOCK_USERS.clinic.id, onOpenChange: vi.fn() }
    const { rerender } = render(
      wrap(<CreateAppointmentDialog {...props} defaultDate="2026-10-08" open />),
    )
    expect(await screen.findByText('08.10.2026')).toBeInTheDocument()

    // Closed, then reopened a day later — the dialog itself stayed mounted.
    rerender(wrap(<CreateAppointmentDialog {...props} defaultDate="2026-10-08" open={false} />))
    rerender(wrap(<CreateAppointmentDialog {...props} defaultDate="2026-10-09" open />))

    expect(await screen.findByText('09.10.2026')).toBeInTheDocument()
    expect(screen.queryByText('08.10.2026')).not.toBeInTheDocument()
  })

  it('uses one input for both a new name and the patient search', async () => {
    render(
      wrap(
        <CreateAppointmentDialog
          clinicId={MOCK_USERS.clinic.id}
          defaultDate="2026-10-08"
          onOpenChange={vi.fn()}
          open
        />,
      ),
    )

    const input = await screen.findByRole('textbox', { name: 'Bemor' })
    fireEvent.change(input, { target: { value: 'Vali' } })

    // Typed text stays as the name even before anything is picked (walk-in)...
    expect(input).toHaveValue('Vali')

    // ...and the same text finds the existing patient, who can be linked.
    fireEvent.click(await screen.findByRole('button', { name: /Vali Aliyev/ }))
    expect(input).toHaveValue('Vali Aliyev')
    expect(
      screen.getByRole('button', { name: "Bemorni bog'lashni bekor qilish" }),
    ).toBeInTheDocument()
  })

  describe('treatment type', () => {
    // "Tozalash" is filed under "Ortodont" in the fixtures, Sardor is a "Stomatolog".
    const ORTHODONTIST = {
      id: 6,
      full_name: 'Aziz Karimov',
      phone_number: null,
      email: null,
      doctor_type: 'Ortodont',
    }

    beforeEach(() => {
      // The shared client may already hold the fixture doctors without the orthodontist.
      queryClient.clear()
      server.use(
        http.get('/api/v1/clinic/doctors/', () =>
          HttpResponse.json([...MOCK_DOCTORS, ORTHODONTIST]),
        ),
      )
    })

    function renderDialog() {
      render(
        wrap(
          <CreateAppointmentDialog
            clinicId={MOCK_USERS.clinic.id}
            defaultDate="2026-10-08"
            onOpenChange={vi.fn()}
            open
          />,
        ),
      )
    }

    async function chooseDoctor(name: string) {
      await userEvent.click(await screen.findByRole('combobox', { name: /^Shifokor/ }))
      await userEvent.click(await screen.findByRole('option', { name }))
    }

    it('offers only a dental doctor’s treatments, and asks for a tooth', async () => {
      renderDialog()
      await chooseDoctor('Sardor Usmonov')

      expect(screen.getByRole('combobox', { name: 'Tish raqami' })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('combobox', { name: /^Davolash turi/ }))
      expect(await screen.findByRole('option', { name: 'Implantatsiya' })).toBeInTheDocument()
      expect(screen.queryByRole('option', { name: 'Tozalash' })).not.toBeInTheDocument()
    })

    it('offers another specialty’s treatments without a tooth number', async () => {
      renderDialog()
      await chooseDoctor('Aziz Karimov')

      expect(screen.queryByRole('combobox', { name: 'Tish raqami' })).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('combobox', { name: /^Davolash turi/ }))
      expect(await screen.findByRole('option', { name: 'Tozalash' })).toBeInTheDocument()
      expect(screen.queryByRole('option', { name: 'Implantatsiya' })).not.toBeInTheDocument()
    })
  })
})
