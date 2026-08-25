import { describe, expect, it } from 'vitest'
import { ApiError, kindFromStatus, normalizeDrfError } from './errors'

/**
 * Every case here is a shape `apps/core/exceptions.py` can actually produce.
 * The envelope is the same for all of them, which is the whole reason the UI
 * can rely on `ApiError` having the fields it does.
 */
describe('normalizeDrfError', () => {
  it('turns per-field DRF codes into translation keys', () => {
    const error = normalizeDrfError({
      status: 400,
      body: {
        message: 'Validation error',
        message_key: 'validation_error',
        // APIExceptionFormatter replaces each ErrorDetail with its `.code`.
        errors: { full_name: 'required', phone_number: 'invalid' },
        exception_class: 'ValidationError',
      },
    })

    expect(error.kind).toBe('validation')
    // §10 — the same key shape Valibot produces, so one code path translates both.
    expect(error.fieldErrors.full_name).toEqual(['validation.required'])
    expect(error.fieldErrors.phone_number).toEqual(['validation.invalid'])
  })

  it('keeps the message key so the UI can translate what the server cannot', () => {
    const error = normalizeDrfError({
      status: 400,
      body: {
        message: 'Invalid username or password',
        message_key: 'invalid_username_or_password',
        errors: {},
        exception_class: 'ValidationError',
      },
    })

    expect(error.messageKey).toBe('invalid_username_or_password')
    // The prose is kept as a fallback, but it is always English.
    expect(error.detail).toBe('Invalid username or password')
    // Nothing addressable to a field: this belongs to the form as a whole.
    expect(error.fieldErrors).toEqual({})
  })

  it('flattens a nested serializer into addressable paths', () => {
    const error = normalizeDrfError({
      status: 400,
      body: {
        message: 'Validation error',
        message_key: 'validation_error',
        // A dict value survives the formatter untouched.
        errors: { medicines: { dose: 'required' } },
        exception_class: 'ValidationError',
      },
    })

    expect(error.fieldErrors['medicines.dose']).toEqual(['validation.required'])
  })

  it('survives the 404 that carries no body at all', () => {
    // drf_exception_handler answers Http404 with Response(status=404), no data.
    const error = normalizeDrfError({ status: 404, body: null })

    expect(error.kind).toBe('notFound')
    expect(error.detail).toBeUndefined()
    expect(error.fieldErrors).toEqual({})
  })

  it('refuses to surface a Django traceback as a message', () => {
    // DEBUG is on in production, so an unhandled 500 returns an HTML page.
    const error = normalizeDrfError({
      status: 500,
      body: '<!DOCTYPE html><title>IntegrityError at /api/patients/</title>',
    })

    expect(error.kind).toBe('server')
    // §13.4 — a traceback can carry SQL and patient data. It stops here.
    expect(error.detail).toBeUndefined()
  })

  it('carries a request id when one is present', () => {
    const error = normalizeDrfError({ status: 500, body: {}, requestId: 'req_01J8' })

    expect(error.requestId).toBe('req_01J8')
  })
})

describe('kindFromStatus', () => {
  it('maps the statuses the UI branches on', () => {
    expect(kindFromStatus(400)).toBe('validation')
    expect(kindFromStatus(401)).toBe('unauthorized')
    expect(kindFromStatus(403)).toBe('forbidden')
    expect(kindFromStatus(404)).toBe('notFound')
    expect(kindFromStatus(409)).toBe('conflict')
    expect(kindFromStatus(429)).toBe('rateLimited')
    expect(kindFromStatus(503)).toBe('server')
  })
})

describe('ApiError', () => {
  it('knows what is worth retrying', () => {
    // Retrying a 403 just asks the server to refuse again.
    expect(new ApiError({ kind: 'forbidden' }).isRetryable).toBe(false)
    expect(new ApiError({ kind: 'validation' }).isRetryable).toBe(false)
    expect(new ApiError({ kind: 'network' }).isRetryable).toBe(true)
    expect(new ApiError({ kind: 'server' }).isRetryable).toBe(true)
  })
})
