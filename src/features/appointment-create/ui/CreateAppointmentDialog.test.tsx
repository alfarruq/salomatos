import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { accessTokenFor, MOCK_USERS } from '@/shared/api/mocks/fixtures'
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
})
