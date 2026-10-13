import { ApiError } from '@/shared/api/errors'

/*
 * The backend has no dedicated code for "the doctor already has a patient at
 * this time": it answers 400 and says so only in the envelope's `message`
 * (English prose) or `message_key`. So the slot clash is recognised by those
 * words. A 409 is the conventional status for the same clash and is accepted
 * too, in case the backend moves to it.
 */
const DOCTOR_BUSY_PATTERN = /already|busy|booked|occupied|not available|unavailable|taken|overlap/i

export function isDoctorBusyError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  if (error.kind === 'conflict') return true
  if (error.kind !== 'validation') return false

  return [error.messageKey, error.detail].some(
    (text) => text !== undefined && DOCTOR_BUSY_PATTERN.test(text.replace(/_/g, ' ')),
  )
}
