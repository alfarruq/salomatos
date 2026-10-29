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
import { CreateAdministratorDialog } from './CreateAdministratorDialog'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

/** A client of its own — see `CreatePatientDialog.test.tsx` for why. */
function renderDialog() {
  const onOpenChange = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <CreateAdministratorDialog clinicId={1} onOpenChange={onOpenChange} open />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { onOpenChange }
}

async function fillIn(username: string) {
  await userEvent.type(await screen.findByLabelText('F. I. Sh.'), 'Yangi Admin')
  await userEvent.type(screen.getByLabelText('Telefon raqami'), '935550077')
  await userEvent.type(screen.getByLabelText('Login'), username)
  await userEvent.type(screen.getByLabelText('Parol'), 'maxfiy-parol')
  await userEvent.click(screen.getByRole('button', { name: "Admin qo'shish" }))
}

describe('CreateAdministratorDialog', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('sends the login and password, never a role or clinic', async () => {
    let sentBody: unknown
    server.use(
      http.post('/api/v1/clinic/admins/', async ({ request }) => {
        sentBody = await request.json()
        return HttpResponse.json({ id: 950, username: 'yangi.admin', full_name: 'Yangi Admin' })
      }),
    )

    const { onOpenChange } = renderDialog()
    await fillIn('yangi.admin')

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(sentBody).toEqual({
      username: 'yangi.admin',
      password: 'maxfiy-parol',
      full_name: 'Yangi Admin',
      phone_number: '+998935550077',
      email: null,
    })
  })

  it('puts a taken login back on the login input', async () => {
    renderDialog()
    await fillIn('reception')

    expect(await screen.findByText('Bu qiymat allaqachon band')).toBeInTheDocument()
  })

  it('refuses a login the server could not match', async () => {
    renderDialog()
    await fillIn('yangi admin')

    expect(
      await screen.findByText('Faqat lotin harflari, raqamlar va . @ + - _ belgilari'),
    ).toBeInTheDocument()
  })
})
