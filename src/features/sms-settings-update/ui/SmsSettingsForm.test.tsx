import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { Suspense } from 'react'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { SmsSettings } from '@/entities/sms'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { createI18n } from '@/shared/i18n'
import { SmsSettingsForm } from './SmsSettingsForm'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

const SETTINGS: SmsSettings = {
  enabled: true,
  reminderOffsetsHours: [2],
  availableOffsetsHours: [24, 2, 1],
  sendOnCreate: false,
  preview: 'Dental Plus: qabulingiz 21.10 kuni 14:30 da.',
}

function renderForm(settings: SmsSettings = SETTINGS) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n('uz-Latn')}>
        <Suspense fallback={null}>
          <SmsSettingsForm clinicId={1} settings={settings} />
        </Suspense>
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

describe('SmsSettingsForm', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('disables the remaining choices once two reminders are picked', async () => {
    renderForm()

    await userEvent.click(await screen.findByLabelText('Qabuldan 1 kun oldin'))

    expect(screen.getByRole('checkbox', { name: 'Qabuldan 1 soat oldin' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Qabuldan 2 soat oldin' })).toBeEnabled()
  })

  it('locks the choices but keeps them when reminders are switched off', async () => {
    renderForm()

    await userEvent.click(await screen.findByRole('switch'))

    const twoHours = screen.getByRole('checkbox', { name: 'Qabuldan 2 soat oldin' })
    expect(twoHours).toBeDisabled()
    expect(twoHours).toBeChecked()
  })

  it('sends the server field names on save', async () => {
    let sentBody: unknown
    server.use(
      http.patch('/api/v1/clinic/sms/settings/', async ({ request }) => {
        sentBody = await request.json()
        return HttpResponse.json({
          enabled: true,
          reminder_offsets_hours: [24, 2],
          available_offsets_hours: [1, 2, 24],
          send_on_create: false,
          preview: SETTINGS.preview,
        })
      }),
    )

    renderForm()

    await userEvent.click(await screen.findByLabelText('Qabuldan 1 kun oldin'))
    await userEvent.click(screen.getByRole('button', { name: 'Saqlash' }))

    await waitFor(() =>
      expect(sentBody).toEqual({
        enabled: true,
        reminder_offsets_hours: [24, 2],
        send_on_create: false,
      }),
    )
  })
})
