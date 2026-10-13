import { describe, expect, it } from 'vitest'
import { ApiError, normalizeDrfError } from '@/shared/api/errors'
import { isDoctorBusyError } from './isDoctorBusyError'

function badRequest(message: string, messageKey: string) {
  return normalizeDrfError({
    status: 400,
    body: { message, message_key: messageKey, errors: {}, exception_class: 'ValidationError' },
  })
}

describe('isDoctorBusyError', () => {
  it('recognises a 400 whose message says the doctor is already booked', () => {
    expect(
      isDoctorBusyError(badRequest('Doctor already has an appointment at this time.', 'error')),
    ).toBe(true)
  })

  it('recognises it from the message key alone', () => {
    expect(isDoctorBusyError(badRequest('Error', 'doctor_is_busy'))).toBe(true)
  })

  it('treats a 409 as the same clash', () => {
    expect(isDoctorBusyError(new ApiError({ kind: 'conflict', status: 409 }))).toBe(true)
  })

  it('leaves an ordinary validation error alone', () => {
    expect(isDoctorBusyError(badRequest('Invalid input.', 'invalid'))).toBe(false)
  })

  it('leaves non-400 failures alone', () => {
    expect(isDoctorBusyError(new ApiError({ kind: 'server', status: 500 }))).toBe(false)
    expect(isDoctorBusyError(new Error('boom'))).toBe(false)
  })
})
