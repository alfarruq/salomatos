import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessTokenFor, MOCK_USERS } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { DeletePatientDialog } from './DeletePatientDialog'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
  vi.useRealTimers()
})
afterAll(() => server.close())

function renderDialog(onDeleted = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <DeletePatientDialog
          clinicId={MOCK_USERS.clinic.id}
          onDeleted={onDeleted}
          onOpenChange={vi.fn()}
          open
          patient={{ id: 101, fullName: 'Vali Aliyev' }}
        />
      </I18nextProvider>
    </QueryClientProvider>,
  )
  return onDeleted
}

/* Fake timers before mount, as in `DeleteTreatmentDialog.test.tsx`. */
const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

async function confirmDelete() {
  await screen.findByRole('button', { name: "O'chirish (10)" })
  await act(async () => {
    vi.advanceTimersByTime(10_000)
  })
  await user.click(screen.getByRole('button', { name: "O'chirish" }))
}

describe('DeletePatientDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    setAccessToken(accessTokenFor('clinic'))
  })

  it('leaves the page once the server confirms the delete', async () => {
    const onDeleted = renderDialog()
    await confirmDelete()
    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledOnce())
  })

  it('names a missing permission instead of a generic failure', async () => {
    server.use(
      http.delete('/api/v1/clinic/patients/:id/', () =>
        HttpResponse.json({ detail: 'forbidden' }, { status: 403 }),
      ),
    )
    const onDeleted = renderDialog()
    await confirmDelete()

    expect(await screen.findByText("Bemorni o'chirishga ruxsatingiz yo'q.")).toBeInTheDocument()
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('shows the status code when the server refuses', async () => {
    server.use(
      http.delete('/api/v1/clinic/patients/:id/', () => new HttpResponse(null, { status: 500 })),
    )
    renderDialog()
    await confirmDelete()

    expect(await screen.findByText(/xato kodi: 500/)).toBeInTheDocument()
  })

  it('treats an already-deleted patient as done', async () => {
    server.use(
      http.delete('/api/v1/clinic/patients/:id/', () => new HttpResponse(null, { status: 404 })),
    )
    const onDeleted = renderDialog()
    await confirmDelete()
    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledOnce())
  })
})
