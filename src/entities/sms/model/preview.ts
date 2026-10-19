import type { SmsBalance, SmsSettings } from './types'

/*
 * Sample data for showing the SMS section before the backend has the
 * endpoints. Nothing here is a real clinic's figure, and nothing is ever
 * saved from it — see `pages/_auth/manage/sms.tsx`.
 */

export const SMS_PREVIEW_BALANCE: SmsBalance = {
  balance: 125_400,
  pricePerSms: 150,
  estimatedSms: 836,
  isLow: false,
}

export function smsPreviewSettings(previewText: string): SmsSettings {
  return {
    enabled: true,
    reminderOffsetsHours: [2],
    availableOffsetsHours: [48, 24, 6, 3, 2, 1],
    sendOnCreate: false,
    preview: previewText,
  }
}
