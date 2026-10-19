export interface SmsSettings {
  enabled: boolean
  /** Hours before the appointment, one reminder per entry. */
  reminderOffsetsHours: number[]
  /** The choices the server accepts — never hardcoded on the client. */
  availableOffsetsHours: number[]
  sendOnCreate: boolean
  /** Rendered by the server from its fixed template, so the clinic sees exactly what is sent. */
  preview: string
}

export interface SmsBalance {
  /** Whole so'm, like every other amount the backend sends. */
  balance: number
  pricePerSms: number
  /** Computed on the server — the client does no money arithmetic (§7.3). */
  estimatedSms: number
  isLow: boolean
}
