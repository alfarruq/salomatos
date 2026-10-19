import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/errors'
import { accessTokenFor } from '@/shared/api/mocks/fixtures'
import { server } from '@/shared/api/mocks/server'
import { clearAccessToken, setAccessToken } from '@/shared/api/tokenStore'
import { fetchSmsBalance, fetchSmsSettings, smsKeys } from './queries'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  clearAccessToken()
})
afterAll(() => server.close())

describe('smsKeys', () => {
  it('puts the clinic inside every key', () => {
    expect(smsKeys.settings(1)).toEqual(['clinics', 1, 'sms', 'settings'])
    expect(smsKeys.balance(1)).toEqual(['clinics', 1, 'sms', 'balance'])
    expect(smsKeys.settings(1)).not.toEqual(smsKeys.settings(2))
  })
})

describe('fetchSmsSettings', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it('maps the wire shape and orders the choices longest lead time first', async () => {
    server.use(
      http.get('/api/v1/clinic/sms/settings/', () =>
        HttpResponse.json({
          enabled: true,
          reminder_offsets_hours: [2],
          available_offsets_hours: [1, 2, 24],
          send_on_create: false,
          preview: 'Dental Plus: qabulingiz 21.10 kuni 14:30 da.',
        }),
      ),
    )

    expect(await fetchSmsSettings()).toEqual({
      enabled: true,
      reminderOffsetsHours: [2],
      availableOffsetsHours: [24, 2, 1],
      sendOnCreate: false,
      preview: 'Dental Plus: qabulingiz 21.10 kuni 14:30 da.',
    })
  })

  it('surfaces a missing endpoint as `notFound`, which the page shows as "not connected"', async () => {
    server.use(
      http.get('/api/v1/clinic/sms/settings/', () =>
        HttpResponse.json({ detail: 'Not found.' }, { status: 404 }),
      ),
    )

    await expect(fetchSmsSettings()).rejects.toSatisfy(
      (error) => error instanceof ApiError && error.kind === 'notFound',
    )
  })
})

describe('fetchSmsBalance', () => {
  beforeEach(() => setAccessToken(accessTokenFor('clinic')))

  it("reads whole so'm and the server-computed estimate", async () => {
    server.use(
      http.get('/api/v1/clinic/sms/balance/', () =>
        HttpResponse.json({
          balance: 125_400,
          price_per_sms: 150,
          estimated_sms: 836,
          is_low: false,
        }),
      ),
    )

    expect(await fetchSmsBalance()).toEqual({
      balance: 125_400,
      pricePerSms: 150,
      estimatedSms: 836,
      isLow: false,
    })
  })

  it('rejects a fractional amount rather than showing a float as money', async () => {
    server.use(
      http.get('/api/v1/clinic/sms/balance/', () =>
        HttpResponse.json({ balance: 10.5, price_per_sms: 150, estimated_sms: 0, is_low: true }),
      ),
    )

    await expect(fetchSmsBalance()).rejects.toThrow()
  })
})
