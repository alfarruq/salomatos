import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as v from 'valibot'
import {
  type SmsSettings,
  type SmsSettingsFormInput,
  smsKeys,
  smsSettingsSchema,
  toSmsSettings,
  toSmsSettingsPayload,
} from '@/entities/sms'
import { httpClient } from '@/shared/api/httpClient'

async function updateSmsSettings(input: SmsSettingsFormInput): Promise<SmsSettings> {
  const raw = await httpClient<unknown>('v1/clinic/sms/settings/', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toSmsSettingsPayload(input)),
  })

  return toSmsSettings(v.parse(smsSettingsSchema, raw))
}

/**
 * ⛔ No optimistic update (§6.5): this decides whether patients get messages
 * the clinic pays for, so the screen shows what the server accepted, not what
 * was clicked.
 */
export function useUpdateSmsSettings(clinicId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateSmsSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(smsKeys.settings(clinicId), settings)
    },
  })
}
