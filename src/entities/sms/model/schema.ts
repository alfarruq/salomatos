import * as v from 'valibot'
import type { SmsBalance, SmsSettings } from './types'

/**
 * The wire contract for `/clinic/sms/settings/` and `/clinic/sms/balance/`.
 *
 * Proposed by the frontend (`analysis/sms-reminders-spec.md` in the project
 * files) and agreed before the backend was written, so there is no real
 * response to check it against yet. The tenant comes from `request.user`, as
 * on every other clinic endpoint — no clinic id travels in the URL.
 */

const hours = v.pipe(v.number(), v.integer(), v.minValue(1))
const som = v.pipe(v.number(), v.integer(), v.minValue(0))

export const smsSettingsSchema = v.object({
  enabled: v.boolean(),
  reminder_offsets_hours: v.array(hours),
  available_offsets_hours: v.array(hours),
  send_on_create: v.boolean(),
  preview: v.string(),
})

export const smsBalanceSchema = v.object({
  balance: som,
  price_per_sms: som,
  estimated_sms: v.pipe(v.number(), v.integer(), v.minValue(0)),
  is_low: v.boolean(),
})

export type SmsSettingsResponse = v.InferOutput<typeof smsSettingsSchema>
export type SmsBalanceResponse = v.InferOutput<typeof smsBalanceSchema>

export function toSmsSettings(response: SmsSettingsResponse): SmsSettings {
  return {
    enabled: response.enabled,
    reminderOffsetsHours: response.reminder_offsets_hours,
    // Sorted so the longest lead time reads first ("1 day before", then "2 hours before").
    availableOffsetsHours: [...response.available_offsets_hours].sort((a, b) => b - a),
    sendOnCreate: response.send_on_create,
    preview: response.preview,
  }
}

export function toSmsBalance(response: SmsBalanceResponse): SmsBalance {
  return {
    balance: response.balance,
    pricePerSms: response.price_per_sms,
    estimatedSms: response.estimated_sms,
    isLow: response.is_low,
  }
}
