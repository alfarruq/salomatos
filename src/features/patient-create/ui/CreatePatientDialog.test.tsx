import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { CreatePatientDialog } from './CreatePatientDialog'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

/**
 * A client of its own rather than the app's `createQueryClient`.
 *
 * Two reasons. The boundaries rule is one: a feature may not import from `app`
 * (§3.3), and a test in this slice is still in this slice. The better one is
 * that these assertions are about the dialog, not about the application's retry
 * policy — a component test that fails when the cache configuration changes is
 * testing the wrong thing.
 */
function renderDialog() {
  const onCreated = vi.fn()
  const onOpenChange = vi.fn()

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    // Locale pinned to the product default: jsdom reports en-US, and these
    // assertions are about what staff actually see.
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <CreatePatientDialog
            clinicId={1}
            onCreated={onCreated}
            onOpenChange={onOpenChange}
            open
          />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { onCreated, onOpenChange }
}

describe('CreatePatientDialog', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('creates a patient and closes', async () => {
    const { onCreated, onOpenChange } = renderDialog()

    await userEvent.type(await screen.findByLabelText('F. I. Sh.'), 'Yangi Bemor')
    await userEvent.type(screen.getByLabelText('Telefon raqami'), '935550022')
    await userEvent.click(screen.getByRole('button', { name: "Bemor qo'shish" }))

    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledOnce())
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('puts the server`s rejection on the field that caused it', async () => {
    renderDialog()

    await userEvent.type(await screen.findByLabelText('F. I. Sh.'), 'Vali Aliyev')
    // Already registered at this clinic — `unique_phone_per_clinic`.
    await userEvent.type(screen.getByLabelText('Telefon raqami'), '901234567')
    await userEvent.click(screen.getByRole('button', { name: "Bemor qo'shish" }))

    /*
     * §10, and the reason field errors are carried as codes: DRF answers
     * `{"phone_number": "unique"}`, which becomes `validation.unique` and is
     * translated here — beside the input, not in a generic banner.
     */
    expect(await screen.findByText('Bu qiymat allaqachon band')).toBeInTheDocument()
  })

  it('does not send an incomplete phone number to the server', async () => {
    const { onCreated } = renderDialog()

    await userEvent.type(await screen.findByLabelText('F. I. Sh.'), 'Yangi Bemor')
    await userEvent.type(screen.getByLabelText('Telefon raqami'), '9355')
    await userEvent.click(screen.getByRole('button', { name: "Bemor qo'shish" }))

    expect(await screen.findByText("Telefon raqami noto'g'ri")).toBeInTheDocument()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('rejects a name too short to identify anyone', async () => {
    const { onCreated } = renderDialog()

    await userEvent.type(await screen.findByLabelText('F. I. Sh.'), 'A')
    await userEvent.type(screen.getByLabelText('Telefon raqami'), '935550022')
    await userEvent.click(screen.getByRole('button', { name: "Bemor qo'shish" }))

    expect(await screen.findByText('Juda qisqa')).toBeInTheDocument()
    expect(onCreated).not.toHaveBeenCalled()
  })
})
