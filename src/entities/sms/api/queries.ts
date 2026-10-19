import { queryOptions } from '@tanstack/react-query'
import * as v from 'valibot'
import { httpClient } from '@/shared/api/httpClient'
import { cachePolicy } from '@/shared/config/cache'
import { smsBalanceSchema, smsSettingsSchema, toSmsBalance, toSmsSettings } from '../model/schema'
import type { SmsBalance, SmsSettings } from '../model/types'

/** §6.2 — `clinicId` is inside every key, without exception. */
export const smsKeys = {
  scope: (clinicId: number) => ['clinics', clinicId, 'sms'] as const,
  settings: (clinicId: number) => [...smsKeys.scope(clinicId), 'settings'] as const,
  balance: (clinicId: number) => [...smsKeys.scope(clinicId), 'balance'] as const,
}

export async function fetchSmsSettings(signal?: AbortSignal): Promise<SmsSettings> {
  const raw = await httpClient<unknown>(
    'v1/clinic/sms/settings/',
    signal === undefined ? {} : { signal },
  )
  return toSmsSettings(v.parse(smsSettingsSchema, raw))
}

export async function fetchSmsBalance(signal?: AbortSignal): Promise<SmsBalance> {
  const raw = await httpClient<unknown>(
    'v1/clinic/sms/balance/',
    signal === undefined ? {} : { signal },
  )
  return toSmsBalance(v.parse(smsBalanceSchema, raw))
}

export const smsQueries = {
  settings: (clinicId: number) =>
    queryOptions({
      queryKey: smsKeys.settings(clinicId),
      queryFn: ({ signal }) => fetchSmsSettings(signal),
      // Changed by the clinic admin a handful of times, ever.
      ...cachePolicy.static,
    }),
  balance: (clinicId: number) =>
    queryOptions({
      queryKey: smsKeys.balance(clinicId),
      queryFn: ({ signal }) => fetchSmsBalance(signal),
      // Money, and it drops with every reminder sent in the background.
      ...cachePolicy.financial,
    }),
}
