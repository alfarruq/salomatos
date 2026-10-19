import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { smsSettingsFormSchema, toSmsSettingsPayload } from './formSchema'

describe('smsSettingsFormSchema', () => {
  it('requires at least one reminder while reminders are on', () => {
    const result = v.safeParse(smsSettingsFormSchema, {
      enabled: true,
      reminderOffsetsHours: [],
      sendOnCreate: false,
    })

    expect(result.success).toBe(false)
    expect(result.issues?.[0]?.message).toBe('validation.smsOffsetRequired')
  })

  it('accepts an empty list once reminders are off', () => {
    expect(
      v.safeParse(smsSettingsFormSchema, {
        enabled: false,
        reminderOffsetsHours: [],
        sendOnCreate: false,
      }).success,
    ).toBe(true)
  })

  it('caps reminders at two', () => {
    expect(
      v.safeParse(smsSettingsFormSchema, {
        enabled: true,
        reminderOffsetsHours: [24, 2, 1],
        sendOnCreate: false,
      }).success,
    ).toBe(false)
  })
})

describe('toSmsSettingsPayload', () => {
  it('writes the server field names', () => {
    expect(
      toSmsSettingsPayload({ enabled: true, reminderOffsetsHours: [24, 2], sendOnCreate: true }),
    ).toEqual({ enabled: true, reminder_offsets_hours: [24, 2], send_on_create: true })
  })
})
