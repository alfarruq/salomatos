import * as v from 'valibot'
import type { SmsSettings } from './types'

/** The server caps reminders per appointment at two; more would mostly cost the clinic money. */
export const MAX_SMS_REMINDERS = 2

/**
 * The writable part of the SMS settings.
 *
 * Switching reminders off keeps the chosen offsets, so turning them back on
 * restores the previous setup — which is why an empty list is only an error
 * while reminders are on.
 */
export const smsSettingsFormSchema = v.pipe(
  v.object({
    enabled: v.boolean(),
    reminderOffsetsHours: v.pipe(
      v.array(v.number()),
      v.maxLength(MAX_SMS_REMINDERS, 'validation.max_length'),
    ),
    sendOnCreate: v.boolean(),
  }),
  v.forward(
    v.partialCheck(
      [['enabled'], ['reminderOffsetsHours']],
      (input) => !input.enabled || input.reminderOffsetsHours.length > 0,
      'validation.smsOffsetRequired',
    ),
    ['reminderOffsetsHours'],
  ),
)

export type SmsSettingsFormInput = v.InferOutput<typeof smsSettingsFormSchema>

export function toSmsSettingsForm(settings: SmsSettings): SmsSettingsFormInput {
  return {
    enabled: settings.enabled,
    reminderOffsetsHours: settings.reminderOffsetsHours,
    sendOnCreate: settings.sendOnCreate,
  }
}

export function toSmsSettingsPayload(input: SmsSettingsFormInput): Record<string, unknown> {
  return {
    enabled: input.enabled,
    reminder_offsets_hours: input.reminderOffsetsHours,
    send_on_create: input.sendOnCreate,
  }
}

const SERVER_FIELD_NAMES: Record<string, keyof SmsSettingsFormInput> = {
  enabled: 'enabled',
  reminder_offsets_hours: 'reminderOffsetsHours',
  send_on_create: 'sendOnCreate',
}

/** The inverse, for putting a server error back on the input that caused it (§10). */
export function smsSettingsFormFieldOf(serverField: string): keyof SmsSettingsFormInput | 'root' {
  return SERVER_FIELD_NAMES[serverField] ?? 'root'
}
