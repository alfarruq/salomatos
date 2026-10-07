import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessTokenFor, MOCK_USERS } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { DeleteTreatmentDialog } from './DeleteTreatmentDialog'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())

/*
 * Fake timers before mount, or the countdown is scheduled on the real clock
 * and advancing fake time moves nothing (see `authFlow.test.tsx`).
 */
const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  setAccessToken(accessTokenFor('clinic'))
})
afterEach(() => {
  vi.useRealTimers()
  server.resetHandlers()
  clearAccessToken()
})

/** Treatment 1 is Vali Aliyev's implant on tooth 36 in `MOCK_TREATMENTS`. */
function renderDialog(treatmentId = 1) {
  const onDeleted = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <DeleteTreatmentDialog
            clinicId={MOCK_USERS.clinic.id}
            onDeleted={onDeleted}
            onOpenChange={vi.fn()}
            open
            treatment={{ id: treatmentId, treatmentTypeName: 'Implantatsiya', toothNumber: 36 }}
          />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )

  return { onDeleted }
}

async function waitOutCountdown() {
  await act(async () => {
    vi.advanceTimersByTime(10_000)
  })
}

describe('DeleteTreatmentDialog', () => {
  it('names the treatment and holds the confirm button for the countdown', async () => {
    renderDialog()

    expect(
      await screen.findByText("Implantatsiya (36-tish) muolajasi butunlay o'chirilsinmi?"),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "O'chirish (10)" })).toBeDisabled()
  })

  it('deletes once the countdown is over and reports back', async () => {
    const { onDeleted } = renderDialog()
    await screen.findByRole('button', { name: "O'chirish (10)" })

    await waitOutCountdown()
    await user.click(screen.getByRole('button', { name: "O'chirish" }))

    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1))
  })

  it('says so when the server refuses, and stays open', async () => {
    const { onDeleted } = renderDialog(404404)
    await screen.findByRole('button', { name: "O'chirish (10)" })

    await waitOutCountdown()
    await user.click(screen.getByRole('button', { name: "O'chirish" }))

    expect(
      await screen.findByText("Muolajani o'chirib bo'lmadi. Qayta urinib ko'ring."),
    ).toBeInTheDocument()
    expect(onDeleted).not.toHaveBeenCalled()
  })
})
